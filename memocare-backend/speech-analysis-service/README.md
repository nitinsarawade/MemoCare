# MemoCare Speech Analysis Service

Real speech-to-text + acoustic feature extraction, using OpenAI's
Whisper model running locally on your own machine. No API key, no
internet needed once set up, no per-use cost.

This replaces the old fake/random stub in the Node backend with real
analysis of what was actually said and how it was said (pauses,
speech rate, filler words, etc.).

## 1. Install Python (if you don't have it)

Download Python 3.10 or 3.11 from https://www.python.org/downloads/
(64-bit Windows installer). During install, check **"Add python.exe to
PATH"**.

Verify in PowerShell:
```powershell
python --version
```

## 2. Install ffmpeg (required — Whisper and audio processing need it)

Easiest way with `winget` (built into modern Windows):
```powershell
winget install ffmpeg
```
Close and reopen PowerShell afterward, then verify:
```powershell
ffmpeg -version
```
If `winget` isn't available, download a build from
https://www.gyan.dev/ffmpeg/builds/ (the "essentials" zip), extract it,
and add its `bin` folder to your PATH manually.

## 3. Set up the Python project

From this `speech-analysis-service` folder in PowerShell:
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

This downloads PyTorch + Whisper (can take a few minutes and a few GB
of disk — one-time cost).

## 4. Run the service

Still with the virtual environment active:
```powershell
uvicorn main:app --host 0.0.0.0 --port 5001
```

The first time you send it an audio file, it downloads the Whisper
model itself (~150MB for the default "base" size) — this needs
internet once, then never again.

Leave this running in its own PowerShell window, alongside your
existing `npm run dev` and `npm run worker` windows.

## 5. Point the Node backend at it

In your Node project's `.env` file, add:
```
FEATURE_EXTRACTION_MODE=http
FEATURE_EXTRACTION_URL=http://localhost:5001/analyze
```

Restart `npm run dev` and `npm run worker` after editing `.env`.

## 6. Apply the database change

The real pipeline stores the actual transcript now, which needs one
new column. From your Node project folder:
```powershell
npm run prisma:migrate
```
(Give the migration a name like `add_transcript` when prompted.)

## Verifying it works

Upload an audio file through `POST /patients/{id}/media/audio` (via
Swagger, `runAnalysis: true`), wait a few seconds to a minute
(transcription takes real time now, unlike the instant fake stub),
then check the media session or the patient's report — you should see
a real `transcriptText` field with what was actually said, and feature
numbers that reflect the real recording instead of random values.

## Notes on accuracy

- `wordFindingDifficultyScore` and `coherenceScore` are transparent,
  documented heuristic formulas based on the real transcript and
  audio (filler-word ratio, pause frequency, vocabulary repetition) —
  not a clinically validated diagnostic model. For a real product or
  thesis defense, be upfront that these are reasonable engineering
  proxies, not a trained/validated clinical instrument.
- The `base` Whisper model is a good speed/accuracy balance for a
  laptop CPU. If you have a good GPU and torch+CUDA installed, or want
  higher accuracy and don't mind waiting longer, set
  `WHISPER_MODEL_SIZE=small` or `medium` as an environment variable
  before starting uvicorn.
