import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { screeningService } from '../../api';
import { API_ORIGIN } from '../../api/client';
import { OBJECT_CATALOG } from './objectCatalog';
import { PageHeader, Card, Button, Badge, FormRow, LoadingState, EmptyState, ErrorState } from '../../components/ui/primitives';

const TEST_TYPES = ['MMSE_STYLE', 'MOCA_STYLE', 'NAME_THE_OBJECTS', 'WORD_RECALL', 'ORIENTATION', 'PATTERN_MEMORY', 'CUSTOM'];
const GAME_TEST_TYPES = new Set(['ORIENTATION', 'WORD_RECALL', 'NAME_THE_OBJECTS', 'PATTERN_MEMORY']);
const ITEM_TYPES = ['text_answer', 'multiple_choice', 'image_naming', 'word_recall', 'pattern_sequence'];

const blankItem = () => ({ prompt: '', itemType: 'text_answer', correctAnswer: '', choices: '', mediaKey: '' });
const pictureUrl = (slug) => `${API_ORIGIN}/assets/objects/${slug}.svg`;
const splitList = (text) => text.split(',').map((x) => x.trim()).filter(Boolean);

// List-type questions store their answer as an array on the backend; naming questions
// accept several synonyms (an array) or a single word (a string).
function buildCorrectAnswer(it) {
  if (it.itemType === 'word_recall' || it.itemType === 'pattern_sequence') return splitList(it.correctAnswer);
  if (it.itemType === 'image_naming') {
    const list = splitList(it.correctAnswer);
    return list.length > 1 ? list : list[0] || '';
  }
  return it.correctAnswer;
}

const ANSWER_HINT = {
  image_naming: 'Accepted answers, comma-separated (e.g. telephone, phone)',
  word_recall: 'All words to recall, comma-separated (any order)',
  pattern_sequence: 'The sequence in the exact order, comma-separated',
};

function PicturePicker({ value, onPick }) {
  const [query, setQuery] = useState('');
  const shown = OBJECT_CATALOG.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
        Picture {value && <span className="field-hint">— {OBJECT_CATALOG.find((o) => `objects/${o.slug}.svg` === value)?.label}</span>}
      </label>
      <input placeholder={`Search ${OBJECT_CATALOG.length} pictures…`} value={query} onChange={(e) => setQuery(e.target.value)} style={{ margin: '6px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6, maxHeight: 190, overflowY: 'auto', padding: 4, border: '1px solid var(--line)', borderRadius: 8 }}>
        {shown.map((o) => {
          const selected = value === `objects/${o.slug}.svg`;
          return (
            <button
              type="button"
              key={o.slug}
              title={o.label}
              onClick={() => onPick(o)}
              style={{ padding: 2, borderRadius: 8, cursor: 'pointer', background: 'transparent', border: selected ? '3px solid #2e6fb7' : '1px solid var(--line)' }}
            >
              <img src={pictureUrl(o.slug)} alt={o.label} width="100%" style={{ display: 'block', borderRadius: 6 }} />
            </button>
          );
        })}
        {shown.length === 0 && <span className="field-hint" style={{ gridColumn: '1 / -1' }}>No picture matches “{query}”.</span>}
      </div>
    </div>
  );
}

export default function ScreeningTestsAdminPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['screening-tests-admin'], queryFn: screeningService.listAllTestsForAdmin });

  const toggleActive = async (test) => {
    await screeningService.setTestActive(test.id, !test.isActive);
    qc.invalidateQueries({ queryKey: ['screening-tests-admin'] });
    qc.invalidateQueries({ queryKey: ['screening-tests'] });
    qc.invalidateQueries({ queryKey: ['games'] });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Screening"
        title="Screening tests"
        description={<>Every test that exists in MemoCare, formal and game-style alike — create, deactivate, or manage them here. “Mind Games” (in the sidebar) is where patients and families actually <em>play</em> the game-style ones; this page is for admins.</>}
        actions={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> New test</Button>}
      />
      <Card style={{ padding: 0 }}>
        {isLoading && <div style={{ padding: 20 }}><LoadingState rows={4} /></div>}
        {isError && <div style={{ padding: 20 }}><ErrorState error={error} onRetry={refetch} /></div>}
        {data?.length === 0 && <div style={{ padding: 20 }}><EmptyState title="No tests created yet" description="Create the first screening test for your patients." /></div>}
        {data?.map((t) => (
          <div className="list-row" key={t.id} style={{ padding: '14px 20px', opacity: t.isActive === false ? 0.55 : 1 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div className="field-hint">
                {t.items?.length ?? t.itemCount ?? 0} items{t.itemsPerAttempt ? ` · ${t.itemsPerAttempt} random per attempt` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge tone={GAME_TEST_TYPES.has(t.testType) ? 'success' : 'info'}>{GAME_TEST_TYPES.has(t.testType) ? 'Mind Game' : 'Formal test'}</Badge>
              <Badge tone="neutral">{t.testType?.replaceAll('_', ' ')}</Badge>
              {t.isActive === false && <Badge tone="neutral">Inactive</Badge>}
              <Button size="sm" variant="ghost" onClick={() => toggleActive(t)}>{t.isActive === false ? 'Reactivate' : 'Deactivate'}</Button>
            </div>
          </div>
        ))}
      </Card>

      {showCreate && (
        <CreateTestModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['screening-tests-admin'] }); qc.invalidateQueries({ queryKey: ['screening-tests'] }); }}
        />
      )}
    </div>
  );
}

function CreateTestModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [testType, setTestType] = useState('CUSTOM');
  const [items, setItems] = useState([blankItem()]);
  const [itemsPerAttempt, setItemsPerAttempt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (i, patch) => setItems((its) => its.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((its) => [...its, blankItem()]);
  const removeItem = (i) => setItems((its) => its.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const missingPicture = items.findIndex((it) => it.itemType === 'image_naming' && !it.mediaKey);
      if (missingPicture !== -1) {
        setError(`Question ${missingPicture + 1} needs a picture — pick one from the grid.`);
        setLoading(false);
        return;
      }
      const perAttempt = itemsPerAttempt === '' ? null : Number(itemsPerAttempt);
      if (perAttempt !== null && (!Number.isInteger(perAttempt) || perAttempt < 1 || perAttempt > items.length)) {
        setError(`"Questions per attempt" must be a whole number between 1 and ${items.length} (the number of items).`);
        setLoading(false);
        return;
      }
      const payload = {
        title,
        testType,
        ...(perAttempt ? { itemsPerAttempt: perAttempt } : {}),
        items: items.map((it, i) => ({
          order: i,
          prompt: it.prompt,
          itemType: it.itemType,
          correctAnswer: buildCorrectAnswer(it),
          ...(it.itemType === 'image_naming' ? { mediaKey: it.mediaKey } : {}),
          ...(it.itemType === 'multiple_choice' ? { choices: splitList(it.choices) } : {}),
        })),
      };
      await screeningService.createTest(payload);
      onCreated();
    } catch (err) {
      setError(err.message || 'Could not create the test.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3>New screening test</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Title"><input required value={title} onChange={(e) => setTitle(e.target.value)} /></FormRow>
          <FormRow label="Test type">
            <select value={testType} onChange={(e) => setTestType(e.target.value)}>
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
            </select>
          </FormRow>

          <FormRow label="Questions per attempt (optional)" hint="Leave empty to ask every item. Set a smaller number to show a different random selection each time.">
            <input type="number" min="1" max={items.length} value={itemsPerAttempt} onChange={(e) => setItemsPerAttempt(e.target.value)} />
          </FormRow>

          <label style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)' }}>Items</label>
          {items.map((it, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginTop: 8 }}>
              <FormRow label={`Question ${i + 1}`}>
                <input required value={it.prompt} onChange={(e) => updateItem(i, { prompt: e.target.value })} />
              </FormRow>
              <div style={{ display: 'flex', gap: 10 }}>
                <FormRow label="Type">
                  <select value={it.itemType} onChange={(e) => updateItem(i, { itemType: e.target.value })}>
                    {ITEM_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Correct answer" hint={ANSWER_HINT[it.itemType]}>
                  <input required value={it.correctAnswer} onChange={(e) => updateItem(i, { correctAnswer: e.target.value })} />
                </FormRow>
              </div>
              {it.itemType === 'image_naming' && (
                <PicturePicker
                  value={it.mediaKey}
                  onPick={(o) => updateItem(i, {
                    mediaKey: `objects/${o.slug}.svg`,
                    correctAnswer: o.accept.join(', '),
                    prompt: it.prompt || 'What is this object?',
                  })}
                />
              )}
              {it.itemType === 'multiple_choice' && (
                <FormRow label="Choices (comma-separated)">
                  <input value={it.choices} onChange={(e) => updateItem(i, { choices: e.target.value })} placeholder="Option A, Option B, Option C" />
                </FormRow>
              )}
              {items.length > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => removeItem(i)}><Trash2 size={13} /> Remove item</Button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={addItem} style={{ marginTop: 10 }}><Plus size={13} /> Add item</Button>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Create test</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
