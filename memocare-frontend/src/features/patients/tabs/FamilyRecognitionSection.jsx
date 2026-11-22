import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { familyQuizService } from '../../../api';
import { http, API_ORIGIN } from '../../../api/client';
import { Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

/**
 * Family photos are served through this API's protected local-storage route,
 * which (like the document and recording files) requires the Bearer token a
 * plain <img src> can't send. Fetch the bytes ourselves and hand back an
 * object URL instead.
 */
function AuthedImage({ src, alt, style }) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    let revoke;
    let cancelled = false;
    (async () => {
      try {
        if (!src.startsWith(API_ORIGIN)) {
          if (!cancelled) setObjectUrl(src);
          return;
        }
        const path = src.slice(API_ORIGIN.length).replace(/^\/api\/v1/, '');
        const res = await http.get(path, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        revoke = url;
        if (!cancelled) setObjectUrl(url);
      } catch {
        if (!cancelled) setObjectUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);

  if (!objectUrl) return <div style={{ ...style, background: 'var(--line-soft)' }} />;
  return <img src={objectUrl} alt={alt} style={style} />;
}

export default function FamilyRecognitionSection({ patient }) {
  return (
    <Routes>
      <Route index element={<FamilyHome patient={patient} />} />
      <Route path="quiz/:attemptId" element={<TakeFamilyQuiz patient={patient} />} />
      <Route path="attempts/:attemptId" element={<FamilyQuizResult patient={patient} />} />
    </Routes>
  );
}

function FamilyHome({ patient }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);

  const membersQuery = useQuery({ queryKey: ['family-members', patient.id], queryFn: () => familyQuizService.listMembers(patient.id) });
  const attemptsQuery = useQuery({ queryKey: ['family-quiz-attempts', patient.id], queryFn: () => familyQuizService.listAttempts(patient.id) });

  const invalidateMembers = () => qc.invalidateQueries({ queryKey: ['family-members', patient.id] });

  const startQuiz = async () => {
    setStarting(true);
    setStartError('');
    try {
      const quiz = await familyQuizService.startQuiz(patient.id);
      // The quiz questions (photos, no names) are handed off via navigation state —
      // a fresh GET would just create ANOTHER new attempt, since starting is itself the "create" action.
      navigate(`quiz/${quiz.attemptId}`, { state: { items: quiz.items } });
    } catch (err) {
      setStartError(err.message || 'Could not start the quiz.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Family recognition</h3>
          <p className="field-hint" style={{ margin: '4px 0 0' }}>
            Add up to 10 family members by photo and name. The quiz shows a random, reshuffled set each time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)} disabled={(membersQuery.data?.length ?? 0) >= 10}>
            <Plus size={14} /> Add family member
          </Button>
          <Button size="sm" onClick={startQuiz} loading={starting} disabled={(membersQuery.data?.length ?? 0) === 0}>
            Take quiz
          </Button>
        </div>
      </div>
      {startError && <div className="auth-banner auth-banner-error">{startError}</div>}

      {membersQuery.isLoading && <LoadingState rows={2} />}
      {membersQuery.data?.length === 0 && (
        <EmptyState icon={<Users size={26} />} title="No family members added yet" description="Add a photo and name to get started." />
      )}
      {membersQuery.data?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          {membersQuery.data.map((m) => (
            <div key={m.id} style={{ width: 92, textAlign: 'center' }}>
              <AuthedImage
                src={m.photoUrl}
                alt={m.fullName}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px' }}
              />
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{m.fullName}</div>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Remove ${m.fullName}?`)) return;
                  await familyQuizService.removeMember(patient.id, m.id);
                  invalidateMembers();
                }}
                style={{ background: 'none', border: 'none', color: 'var(--danger, #c0392b)', cursor: 'pointer', fontSize: 11.5, padding: 2 }}
              >
                <Trash2 size={11} style={{ verticalAlign: 'middle' }} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <h4 style={{ marginBottom: 8 }}>Past quiz attempts</h4>
      {attemptsQuery.isLoading && <LoadingState rows={2} />}
      {attemptsQuery.data?.length === 0 && <p className="field-hint">No attempts yet.</p>}
      {attemptsQuery.data?.map((a) => (
        <Link key={a.id} to={`attempts/${a.id}`} className="list-row" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span>{formatDate(a.completedAt || a.startedAt, true)}</span>
          <Badge tone="info">{a.scorePercentage != null ? `${a.totalScore} / ${a.maxPossibleScore} (${Math.round(a.scorePercentage)}%)` : 'In progress'}</Badge>
        </Link>
      ))}

      {showAdd && (
        <AddFamilyMemberModal
          onClose={() => setShowAdd(false)}
          onAdd={async (payload) => {
            await familyQuizService.addMember(patient.id, payload);
            setShowAdd(false);
            invalidateMembers();
          }}
        />
      )}
    </Card>
  );
}

function AddFamilyMemberModal({ onClose, onAdd }) {
  const [fullName, setFullName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Choose a photo first.'); return; }
    setLoading(true);
    setError('');
    try {
      await onAdd({ file, fullName });
    } catch (err) {
      setError(err.message || 'Could not add this family member.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Add family member</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Full name"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></FormRow>
          <FormRow label="Photo" hint="JPG, PNG, WEBP, or HEIC">
            <input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Add</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TakeFamilyQuiz({ patient }) {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const items = state?.items || [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) {
    return <ErrorState error={{ message: 'This quiz session has expired. Start a new one from the Screening tab.' }} />;
  }

  const current = items[index];
  const isLast = index === items.length - 1;

  const setAnswer = (value) => setAnswers((a) => ({ ...a, [current.familyMemberId]: value }));

  const next = async () => {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = items.map((it) => ({ familyMemberId: it.familyMemberId, givenAnswer: answers[it.familyMemberId] || '' }));
      await familyQuizService.submitQuiz(patient.id, attemptId, payload);
      navigate(`../attempts/${attemptId}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not submit the quiz.');
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Link to=".." style={{ fontSize: 13.5 }}>← Back to family recognition</Link>
      <div className="field-hint" style={{ margin: '12px 0 6px' }}>Photo {index + 1} of {items.length}</div>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      <h3 style={{ marginBottom: 14 }}>Who is this?</h3>
      <AuthedImage src={current.photoUrl} alt="" style={{ width: 180, height: 180, borderRadius: 12, objectFit: 'cover', marginBottom: 16 }} />
      <div className="form-row">
        <input
          autoFocus
          value={answers[current.familyMemberId] || ''}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type their name…"
        />
      </div>
      <Button onClick={next} loading={submitting} style={{ marginTop: 14 }} disabled={!answers[current.familyMemberId]}>
        {isLast ? 'Submit' : 'Next'}
      </Button>
    </Card>
  );
}

function FamilyQuizResult({ patient }) {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    familyQuizService.getAttempt(patient.id, attemptId).then(setAttempt).catch((e) => setError(e.message));
  }, [patient.id, attemptId]);

  if (error) return <ErrorState error={{ message: error }} />;
  if (!attempt) return <LoadingState rows={4} />;

  return (
    <Card>
      <Link to=".." style={{ fontSize: 13.5 }}>← Back to family recognition</Link>
      <h3 style={{ margin: '12px 0 4px' }}>Quiz result</h3>
      <p className="field-hint" style={{ marginBottom: 16 }}>{formatDate(attempt.completedAt, true)}</p>
      <div className="result-metric-value" style={{ marginBottom: 16 }}>
        {attempt.totalScore} / {attempt.maxPossibleScore}
        {attempt.scorePercentage != null ? ` (${Math.round(attempt.scorePercentage)}%)` : ''}
      </div>
      {attempt.answers.map((a, i) => (
        <div className="mini-row" key={a.familyMemberId || i}>
          <span>{a.fullName}{a.givenAnswer ? ` — answered "${a.givenAnswer}"` : ' — no answer'}</span>
          <Badge tone={a.isCorrect ? 'success' : 'danger'}>{a.isCorrect ? 'Correct' : 'Incorrect'}</Badge>
        </div>
      ))}
    </Card>
  );
}
