import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload, Mic, Square, FileAudio, ArrowLeft } from 'lucide-react';
import { mediaService } from '../../../api';
import { Card, Button, RiskBadge, LoadingState, EmptyState, ErrorState, Badge } from '../../../components/ui/primitives';

export default function RecordingsTab({ patient }) {
  return (
    <Routes>
      <Route index element={<RecordingsList patient={patient} />} />
      <Route path="new" element={<UploadRecording patient={patient} />} />
      <Route path=":mediaId" element={<RecordingDetail />} />
    </Routes>
  );
}

function RecordingsList({ patient }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['media', patient.id], queryFn: () => mediaService.list(patient.id) });

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Recordings</h3>
        <Button as={Link} to="new" size="sm">
          <Mic size={14} /> New recording
        </Button>
      </div>
      {isLoading && <LoadingState rows={4} />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && data.length === 0 && (
        <EmptyState
          icon={<FileAudio size={28} />}
          title="No recordings yet"
          description="Upload a short voice sample to get the first speech-analysis result."
          action={<Button as={Link} to="new" size="sm">Record now</Button>}
        />
      )}
      {data?.map((m) => (
        <Link key={m.id} to={`${m.id}`} className="list-row" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{new Date(m.createdAt).toLocaleString()}</div>
            <div className="field-hint">{m.assessmentTag || m.mediaType}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={m.status} />
            {m.status === 'COMPLETED' && <RiskBadge level={m.analysisResult?.riskLevel} size="sm" />}
          </div>
        </Link>
      ))}
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = {
    COMPLETED: { tone: 'success', label: 'Analyzed' },
    PROCESSING: { tone: 'info', label: 'Processing…' },
    QUEUED: { tone: 'neutral', label: 'Queued' },
    FAILED: { tone: 'danger', label: 'Failed' },
  };
  const { tone, label } = map[status] || { tone: 'neutral', label: status };
  return <Badge tone={tone}>{label}</Badge>;
}

function UploadRecording({ patient }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [tag, setTag] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Optional browser recording, kept simple: MediaRecorder -> a File the same upload path can use.
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setFile(new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' }));
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecording(true);
    } catch {
      setError("Couldn't access the microphone. You can upload a file instead.");
    }
  };
  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const durationSeconds = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined;
      const media = await mediaService.upload(patient.id, { file, assessmentTag: tag || undefined, durationSeconds, onProgress: setProgress });
      navigate(`../${media.id}`, { relative: 'path' });
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560 }}>
      <Link to=".." relative="path" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to recordings
      </Link>
      <h3>New recording</h3>
      <p className="field-hint" style={{ marginBottom: 18 }}>Record in the browser or upload an audio/video file. Analysis runs automatically after upload.</p>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      {!file && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {!recording ? (
              <Button variant="secondary" onClick={startRecording}><Mic size={15} /> Record in browser</Button>
            ) : (
              <Button variant="danger" onClick={stopRecording}><Square size={15} /> Stop recording</Button>
            )}
          </div>
          <label className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          >
            <Upload size={26} style={{ marginBottom: 8 }} />
            <div>Drag a file here, or click to choose an audio/video file</div>
            <input type="file" accept="audio/*,video/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </>
      )}

      {file && (
        <div style={{ marginBottom: 16 }}>
          <div className="list-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileAudio size={18} />
              <span>{file.name}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>Change</Button>
          </div>
          <div className="form-row">
            <label htmlFor="tag">Label (optional)</label>
            <input id="tag" placeholder="e.g. Weekly check-in" value={tag} onChange={(e) => setTag(e.target.value)} />
          </div>
          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div className="qa-progress-bar"><div className="qa-progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="field-hint">Uploading… {progress}%</div>
            </div>
          )}
          <Button onClick={submit} loading={uploading} style={{ width: '100%' }}>Upload & analyze</Button>
        </div>
      )}
    </Card>
  );
}

function RecordingDetail() {
  const { mediaId } = useParams();
  const [media, setMedia] = useState(null);
  const [error, setError] = useState(null);
  const [playable, setPlayable] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const m = await mediaService.get(mediaId);
        if (cancelled) return;
        setMedia(m);
        if (m.status === 'QUEUED' || m.status === 'PROCESSING') {
          timer = setTimeout(poll, 4000);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mediaId]);

  useEffect(() => {
    if (media?.status === 'COMPLETED') {
      mediaService.fetchPlayableUrl(mediaId).then(setPlayable).catch(() => {});
    }
    return () => playable?.revoke?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.status, mediaId]);

  if (error) return <ErrorState error={error} />;
  if (!media) return <LoadingState rows={4} />;

  const result = media.analysisResult;
  const isBusy = media.status === 'QUEUED' || media.status === 'PROCESSING';

  return (
    <Card style={{ maxWidth: 640 }}>
      <Link to=".." relative="path" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to recordings
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{new Date(media.createdAt).toLocaleString()}</h3>
        <StatusBadge status={media.status} />
      </div>

      {isBusy && (
        <div style={{ marginTop: 24 }}>
          <LoadingState rows={1} />
          <p className="field-hint" style={{ marginTop: 8 }}>
            Transcribing and analyzing the recording — this runs in the background and can take a minute for longer samples.
          </p>
        </div>
      )}

      {media.status === 'FAILED' && (
        <div className="auth-banner auth-banner-error" style={{ marginTop: 18 }}>
          Analysis couldn't be completed for this recording. Try uploading again with a clearer sample.
        </div>
      )}

      {media.status === 'COMPLETED' && result && (
        <>
          {playable && (
            <audio controls src={playable.url} style={{ width: '100%', marginTop: 16 }}>
              <track kind="captions" />
            </audio>
          )}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="field-hint">Overall assessment</span>
            <RiskBadge level={result.riskLevel} />
          </div>

          <div className="result-card">
            {result.speechRate != null && <Metric label="Speech rate (wpm)" value={Math.round(result.speechRate)} />}
            {result.pauseCount != null && <Metric label="Pause count" value={result.pauseCount} />}
            {result.avgPauseDuration != null && <Metric label="Avg pause (s)" value={result.avgPauseDuration.toFixed?.(1) ?? result.avgPauseDuration} />}
            {result.fillerWordCount != null && <Metric label="Filler words" value={result.fillerWordCount} />}
            {result.wordFindingDifficulty != null && <Metric label="Word-finding difficulty" value={pct(result.wordFindingDifficulty)} />}
            {result.coherenceScore != null && <Metric label="Coherence" value={pct(result.coherenceScore)} />}
          </div>

          {media.transcript && (
            <>
              <h4 style={{ marginBottom: 8 }}>Transcript</h4>
              <div className="transcript-box">{media.transcript}</div>
            </>
          )}

          <div className="disclaimer-strip">
            This is an observed-indicators screening result from a documented heuristic — not a clinical diagnosis of dementia or Alzheimer's. Share it with a clinician for interpretation.
          </div>
        </>
      )}
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <div className="result-metric">
      <div className="result-metric-value">{value}</div>
      <div className="result-metric-label">{label}</div>
    </div>
  );
}
function pct(v) {
  return v <= 1 ? `${Math.round(v * 100)}%` : v;
}
