import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { screeningService } from '../../../api';
import { Card, Button, Badge, LoadingState, EmptyState, ErrorState } from '../../../components/ui/primitives';
import FamilyRecognitionSection from './FamilyRecognitionSection';

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

function formatScore(a) {
  if (a.totalScore == null) return '';
  const base = a.maxPossibleScore ? `${a.totalScore} / ${a.maxPossibleScore}` : `${a.totalScore}`;
  return a.scorePercentage != null ? `${base} (${Math.round(a.scorePercentage)}%)` : base;
}


export default function ScreeningTab({ patient }) {
  return (
    <Routes>
      <Route index element={<ScreeningHome patient={patient} />} />
      <Route path="take/:testId" element={<TakeTest patient={patient} />} />
      <Route path="attempts/:attemptId" element={<AttemptResult patient={patient} />} />
      <Route path="family/*" element={<FamilyRecognitionSection patient={patient} />} />
    </Routes>
  );
}

// The 12-colour palette shared with the Color Pattern Recall game (same list
// the backend seeds its pattern pool from). Ordered display phase plays for
// each pattern_sequence item: colours appear one by one (1s each), then the
// pattern hides and the user waits out a countdown before answering.
const COLOR_PALETTE = [
  { name: 'Red', hex: '#E23B3B' }, { name: 'Blue', hex: '#2C6FE8' }, { name: 'Green', hex: '#2F9E5B' },
  { name: 'Yellow', hex: '#F5C518' }, { name: 'Purple', hex: '#7B4FD8' }, { name: 'Orange', hex: '#F08030' },
  { name: 'Pink', hex: '#EE6FA8' }, { name: 'Brown', hex: '#8B5A2B' }, { name: 'Black', hex: '#222222' },
  { name: 'White', hex: '#FFFFFF' }, { name: 'Grey', hex: '#9A9AA5' }, { name: 'Teal', hex: '#2FB8A8' },
];
const colorHex = (name) => (COLOR_PALETTE.find((c) => c.name.toLowerCase() === String(name).toLowerCase()) || {}).hex;

function ColorPatternPhase({ item, answers, setAnswer, canNext, next, error, submitting, isLast }) {
  const HIDE_AFTER_SECONDS = 5;
  const correctList = Array.isArray(item.correctAnswer) ? item.correctAnswer : [];
  // correctAnswer is never sent to the client; colour names come from choices.
  const seq = (item.sequence && item.sequence.length ? item.sequence : item.choices || []).slice(0, 4);
  const [phase, setPhase] = useState('showing'); // 'showing' | 'hidden' | 'input'
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [countLeft, setCountLeft] = useState(HIDE_AFTER_SECONDS);

  useEffect(() => {
    if (phase !== 'showing') return undefined;
    if (visibleIdx >= seq.length) {
      const t = setTimeout(() => setPhase('hidden'), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleIdx((i) => i + 1), 1000);
    return () => clearTimeout(t);
  }, [phase, visibleIdx, seq.length]);

  useEffect(() => {
    if (phase !== 'hidden') return undefined;
    if (countLeft <= 0) {
      setPhase('input');
      return undefined;
    }
    const t = setTimeout(() => setCountLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countLeft]);

  const selected = Array.isArray(answers[item.id]) ? answers[item.id] : [];
  // A colour can appear more than once in a sequence, so every tap adds one
  // more pick (up to the sequence length); Undo / Clear remove picks.
  const toggle = (colorName) => {
    if (phase !== 'input') return;
    if (selected.length < seq.length) setAnswer([...selected, colorName]);
  };
  const undo = () => setAnswer(selected.slice(0, -1));
  const clearAll = () => setAnswer([]);

  return (
    <div>
      <div className="field-hint" style={{ marginBottom: 10 }}>
        {phase === 'showing' && 'Memorize the colours…'}
        {phase === 'hidden' && `Get ready… input opens in ${countLeft}s`}
        {phase === 'input' && `Now type the colours back in the SAME order you saw them (pick ${seq.length} cards — a colour can repeat).`}
      </div>

      {phase !== 'input' && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '18px 0 22px' }}>
          {seq.map((c, i) => (
            <div
              key={i}
              style={{
                width: 66, height: 66, borderRadius: 14,
                background: phase === 'showing' && visibleIdx > i ? colorHex(c) : 'var(--line-soft)',
                border: '2px solid var(--line)',
                boxShadow: phase === 'showing' && visibleIdx > i ? 'var(--shadow-md)' : 'none',
                transition: 'background 0.25s ease',
              }}
              aria-label={phase === 'showing' && visibleIdx > i ? `Colour ${i + 1}` : 'Hidden colour'}
            />
          ))}
        </div>
      )}

      {phase === 'input' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, margin: '12px 0 16px', maxWidth: 420 }}>
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => toggle(c.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 9px', borderRadius: 10, cursor: 'pointer',
                  border: selected.includes(c.name) ? '2px solid var(--primary)' : '1px solid var(--line)',
                  background: selected.includes(c.name) ? 'var(--primary-tint)' : 'var(--paper-raised)',
                  fontSize: 12.5, fontWeight: 600,
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.hex, border: '1px solid var(--line)', flexShrink: 0 }} />
                {c.name}
                {selected.filter((x) => x === c.name).length > 1 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11 }}>×{selected.filter((x) => x === c.name).length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="field-hint" style={{ marginBottom: 10 }}>
            Your answer, in order: {selected.length ? selected.join(' → ') : '—'} ({selected.length}/{seq.length})
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={!selected.length}>Undo last</Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearAll} disabled={!selected.length}>Clear</Button>
          </div>
          <Button onClick={next} disabled={!canNext} loading={submitting} style={{ width: '100%' }}>
            {isLast ? 'Submit' : 'Next'}
          </Button>
        </>
      )}
    </div>
  );
}

function ScreeningHome({ patient }) {
  const testsQuery = useQuery({ queryKey: ['screening-tests'], queryFn: screeningService.listTests });
  const attemptsQuery = useQuery({ queryKey: ['screening-attempts', patient.id], queryFn: () => screeningService.listAttempts(patient.id) });

  return (
    <div className="overview-grid">
      <Card>
        <h3 style={{ marginBottom: 12 }}>Available tests</h3>
        {testsQuery.isLoading && <LoadingState rows={3} />}
        {testsQuery.isError && <ErrorState error={testsQuery.error} onRetry={testsQuery.refetch} />}
        {testsQuery.data?.length === 0 && <EmptyState icon={<ClipboardList size={26} />} title="No tests available yet" />}
        {testsQuery.data?.filter((t, index, all) => t.testType !== 'PATTERN_MEMORY' || index === all.findIndex((candidate) => candidate.testType === 'PATTERN_MEMORY')).map((t) => (
          <div key={t.id} className="list-row">
            <div>
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div className="field-hint">{t.testType?.replaceAll('_', ' ')}</div>
            </div>
            <Button as={Link} to={`take/${t.id}`} size="sm">Take test</Button>
          </div>
        ))}
      </Card>

      <Card>
        <h3 style={{ marginBottom: 12 }}>Past attempts</h3>
        {attemptsQuery.isLoading && <LoadingState rows={3} />}
        {attemptsQuery.isError && <ErrorState error={attemptsQuery.error} onRetry={attemptsQuery.refetch} />}
        {attemptsQuery.data?.length === 0 && <p className="field-hint">No attempts yet.</p>}
        {attemptsQuery.data?.map((a) => (
          <Link key={a.id} to={`attempts/${a.id}`} className="list-row" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.test?.title || 'Screening test'}</div>
              <div className="field-hint">{formatDate(a.completedAt || a.startedAt)}</div>
            </div>
            <Badge tone="info">{formatScore(a) || 'In progress'}</Badge>
          </Link>
        ))}
      </Card>

      <FamilyRecognitionLink />
    </div>
  );
}

function FamilyRecognitionLink() {
  return (
    <Card className="overview-span-2">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Family recognition</h3>
          <p className="field-hint" style={{ margin: '4px 0 0' }}>Add named family photos and take a "who is this?" quiz.</p>
        </div>
        <Button as={Link} to="family" size="sm">Open</Button>
      </div>
    </Card>
  );
}

function TakeTest({ patient }) {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    screeningService.getTest(testId).then(setTest).catch((e) => setError(e.message));
  }, [testId]);

  if (error) return <ErrorState error={{ message: error }} />;
  if (!test) return <LoadingState rows={4} />;

  const items = test.items || [];
  const item = items[index];
  const progressPct = items.length ? Math.round(((index) / items.length) * 100) : 0;
  const isPattern = item?.itemType === 'pattern_sequence' || test.testType === 'PATTERN_MEMORY';
  const setAnswer = (val) => setAnswers((a) => ({ ...a, [item.id]: val }));
  const canNext = isPattern
    ? Array.isArray(answers[item?.id]) && answers[item?.id]?.length === (item?.choices?.length ? Math.min(4, item.choices.length) : 4)
    : answers[item?.id] != null && answers[item?.id] !== '';

  const next = async () => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = items.map((it) => ({ itemId: it.id, givenAnswer: answers[it.id] ?? '' }));
      const attempt = await screeningService.submit(patient.id, testId, payload);
      navigate(`../../attempts/${attempt.id}`, { relative: 'path', replace: true });
    } catch (err) {
      setError(err.message || 'Could not submit your answers.');
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ maxWidth: 560 }}>
      <Link to="../.." relative="path" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to screening
      </Link>
      <div className="field-hint" style={{ marginBottom: 6 }}>Question {index + 1} of {items.length}</div>
      <div className="qa-progress-bar"><div className="qa-progress-fill" style={{ width: `${progressPct}%` }} /></div>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      {isPattern ? (
        <ColorPatternPhase
          key={item.id}
          item={item}
          answers={answers}
          setAnswer={setAnswer}
          canNext={canNext}
          next={next}
          submitting={submitting}
          isLast={index === items.length - 1}
        />
      ) : (
        <>
          <h3>{item?.prompt || item?.question}</h3>

          {item?.mediaUrl && (
            <img
              src={item.mediaUrl}
              alt={item?.prompt ? `Picture for the question: ${item.prompt}` : 'Screening question picture'}
              style={{ maxWidth: '100%', borderRadius: 10, marginBottom: 14 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}

          {item?.itemType === 'multiple_choice' && (
        <div style={{ marginTop: 12 }}>
          {(item.choices || []).map((choice) => (
            <button
              type="button"
              key={choice}
              className={`choice-option ${answers[item.id] === choice ? 'selected' : ''}`}
              onClick={() => setAnswer(choice)}
              aria-pressed={answers[item.id] === choice}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {(item?.itemType === 'text_answer' || item?.itemType === 'word_recall' || item?.itemType === 'image_naming' || !item?.itemType) && (
            <div className="form-row" style={{ marginTop: 12 }}>
              <input autoFocus value={answers[item?.id] ?? ''} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer…" />
            </div>
          )}

          <Button onClick={next} disabled={!canNext} loading={submitting} style={{ width: '100%', marginTop: 8 }}>
            {index < items.length - 1 ? 'Next' : 'Submit'}
          </Button>
        </>
      )}
    </Card>
  );
}

function AttemptResult({ patient }) {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    screeningService.getAttempt(patient.id, attemptId).then(setAttempt).catch(setError);
  }, [patient.id, attemptId]);

  if (error) return <ErrorState error={error} />;
  if (!attempt) return <LoadingState rows={4} />;

  return (
    <Card style={{ maxWidth: 560 }}>
      <Link to="../.." relative="path" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to screening
      </Link>
      <h3>{attempt.test?.title || 'Screening result'}</h3>
      <p className="field-hint">{formatDate(attempt.completedAt || attempt.startedAt, true)}</p>
      <div className="result-card">
        <div className="result-metric">
          <div className="result-metric-value">{formatScore(attempt) || '—'}</div>
          <div className="result-metric-label">Score</div>
        </div>
      </div>
      {attempt.answers?.length > 0 && (
        <>
          <h4 style={{ marginBottom: 8 }}>Item-by-item</h4>
          {attempt.answers.map((r, i) => (
            <div className="mini-row" key={r.id || i}>
              <span>{r.item?.prompt || `Item ${i + 1}`}</span>
              <Badge tone={r.isCorrect ? 'success' : 'danger'}>{r.isCorrect ? 'Correct' : 'Incorrect'}</Badge>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}
