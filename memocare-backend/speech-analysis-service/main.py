"""
MemoCare speech-analysis microservice.

Replaces the Node backend's random-number stub with REAL speech
processing:
  1. Transcribes the audio with OpenAI Whisper (runs fully locally,
     no internet needed once the model is downloaded once).
  2. Extracts acoustic features from the raw audio with pydub
     (pause count / duration via silence detection).
  3. Extracts linguistic features from the transcript (speech rate,
     filler-word count, and two documented heuristics —
     word-finding-difficulty and coherence — derived from the actual
     transcript, not random numbers).

This service does ONE job: given an audio file, return numbers +
text. The Node backend (src/services/mlRiskService.ts, HttpFeatureExtractor)
calls this over HTTP and still does its own separate risk-scoring step.

Run it with:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 5001

Requires ffmpeg to be installed and on PATH (needed by both Whisper
and pydub to decode audio/video files).
"""

import os
import re
import tempfile
from typing import Optional

import whisper
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel
from pydub import AudioSegment
from pydub.silence import detect_silence

app = FastAPI(title="MemoCare Speech Analysis Service")

# "tiny"/"base" run reasonably fast on a normal laptop CPU. "small"/"medium"
# are more accurate but noticeably slower without a GPU. Override with the
# WHISPER_MODEL_SIZE env var if you want to try a different size.
MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")
_model = None


def get_model():
    """Lazy-load the Whisper model once and reuse it across requests."""
    global _model
    if _model is None:
        print(f"Loading Whisper model '{MODEL_SIZE}' (first run downloads it, ~1-2 min)...")
        _model = whisper.load_model(MODEL_SIZE)
        print("Whisper model loaded.")
    return _model


# Filler words/phrases we count as evidence of word-finding difficulty.
# Kept deliberately narrow (clear disfluencies only) so ordinary words
# like "like" or "so" used correctly aren't miscounted.
FILLER_PATTERN = re.compile(
    r"\b(um+|uh+|erm+|hmm+|ah+|you know|i mean)\b", re.IGNORECASE
)


class AnalysisResponse(BaseModel):
    pauseCount: int
    avgPauseDurationMs: int
    speechRateWpm: float
    fillerWordCount: int
    wordFindingDifficultyScore: float
    coherenceScore: float
    transcriptText: str
    rawFeatureJson: dict


def extract_acoustic_features(audio: AudioSegment) -> tuple[int, int]:
    """Pause count + average pause duration via silence detection."""
    silence_thresh = audio.dBFS - 16 if audio.dBFS != float("-inf") else -50
    silences = detect_silence(audio, min_silence_len=400, silence_thresh=silence_thresh)
    if not silences:
        return 0, 0
    durations = [end - start for start, end in silences]
    return len(durations), int(sum(durations) / len(durations))


def compute_linguistic_features(transcript: str, duration_ms: int) -> dict:
    words = transcript.split()
    word_count = len(words)
    duration_minutes = max(duration_ms / 60000.0, 1 / 60.0)  # avoid div-by-zero on tiny clips

    speech_rate_wpm = round(word_count / duration_minutes, 1)
    filler_word_count = len(FILLER_PATTERN.findall(transcript))

    # --- Word-finding-difficulty heuristic (0-1) ---
    # Higher filler-word ratio and more frequent pauses both suggest more
    # effort finding words. This is a documented proxy formula, not a
    # clinically validated score — swap in a trained model here later if
    # you have labeled data to train one.
    filler_ratio = filler_word_count / max(word_count, 1)
    return {
        "word_count": word_count,
        "duration_minutes": round(duration_minutes, 2),
        "speech_rate_wpm": speech_rate_wpm,
        "filler_word_count": filler_word_count,
        "filler_ratio": round(filler_ratio, 4),
    }


def compute_coherence_score(transcript: str) -> float:
    """
    Lexical-diversity proxy for coherence (0-1): the fraction of unique
    words used. Heavy repetition (a real symptom clinicians look for)
    pulls this down; varied vocabulary pushes it up. Like the
    word-finding score, this is a transparent heuristic derived from
    the actual transcript — not a semantic-understanding model.
    """
    words = [w.strip(".,!?;:").lower() for w in transcript.split() if w.strip(".,!?;:")]
    if not words:
        return 0.0
    unique_ratio = len(set(words)) / len(words)
    return round(min(1.0, unique_ratio), 4)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "modelLoaded": _model is not None}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        try:
            audio = AudioSegment.from_file(tmp_path)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Could not decode audio (is ffmpeg installed?): {exc}",
            )

        duration_ms = len(audio)
        pause_count, avg_pause_ms = extract_acoustic_features(audio)

        model = get_model()
        result = model.transcribe(tmp_path, fp16=False)
        transcript_text: str = result.get("text", "").strip()

        linguistic = compute_linguistic_features(transcript_text, duration_ms)
        coherence_score = compute_coherence_score(transcript_text)

        filler_ratio = linguistic["filler_ratio"]
        pauses_per_minute = pause_count / max(linguistic["duration_minutes"], 1 / 60.0)
        word_finding_difficulty_score = round(
            min(1.0, filler_ratio * 3 + min(pauses_per_minute / 20, 1) * 0.5), 4
        )

        return AnalysisResponse(
            pauseCount=pause_count,
            avgPauseDurationMs=avg_pause_ms,
            speechRateWpm=linguistic["speech_rate_wpm"],
            fillerWordCount=linguistic["filler_word_count"],
            wordFindingDifficultyScore=word_finding_difficulty_score,
            coherenceScore=coherence_score,
            transcriptText=transcript_text,
            rawFeatureJson={
                "durationMs": duration_ms,
                "wordCount": linguistic["word_count"],
                "pausesPerMinute": round(pauses_per_minute, 2),
                "whisperModel": MODEL_SIZE,
            },
        )
    finally:
        os.unlink(tmp_path)
