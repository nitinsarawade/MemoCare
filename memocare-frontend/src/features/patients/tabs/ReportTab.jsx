import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Upload, Trash2, FileText } from 'lucide-react';
import { reportService, documentService } from '../../../api';
import { Card, Button, Badge, RiskBadge, FormRow, LoadingState, ErrorState } from '../../../components/ui/primitives';
import { useAuth, isClinical } from '../../../auth/AuthContext';

function trendTone(trend) {
  const t = (trend || '').toUpperCase();
  if (t === 'IMPROVING') return 'success';
  if (t === 'DECLINING') return 'danger';
  return 'neutral';
}
function trendLabel(trend) {
  const t = (trend || '').toUpperCase();
  return { IMPROVING: 'Improving', STABLE: 'Stable', DECLINING: 'Declining', INSUFFICIENT_DATA: 'Not enough data yet' }[t] || 'Not enough data yet';
}

export default function ReportTab({ patient }) {
  const { role } = useAuth();
  const staff = isClinical(role);
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showNote, setShowNote] = useState(false);

  const reportQuery = useQuery({ queryKey: ['report', patient.id], queryFn: () => reportService.get(patient.id) });
  const notesQuery = useQuery({ queryKey: ['notes', patient.id], queryFn: () => reportService.listNotes(patient.id), enabled: staff || true });

  const exportPdf = async () => {
    setExporting(true);
    setExportError('');
    try {
      const blob = await reportService.exportPdf(patient.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${patient.firstName}-${patient.lastName}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message || 'Could not export the PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (reportQuery.isLoading) return <LoadingState rows={5} />;
  if (reportQuery.isError) return <ErrorState error={reportQuery.error} onRetry={reportQuery.refetch} />;
  const report = reportQuery.data;
  if (!report) return null;

  // The backend sends two different shapes: a clinical report (staff/admin)
  // nests the trend/timeline data under `report.summary`; a simplified
  // report (family/caretaker) has those same fields at the top level.
  // Normalize once so the rest of this component doesn't care which one it got.
  const summary = report.reportType === 'clinical' ? report.summary : report;
  const currentRiskLevel = summary?.latestSpeechRisk?.raw?.riskLevel || patient.latestRiskLevel;

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>{staff ? 'Full clinical report' : 'Report summary'}</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <RiskBadge level={currentRiskLevel} />
              <Badge tone={trendTone(summary?.trends?.overall)}>{trendLabel(summary?.trends?.overall)}</Badge>
            </div>
          </div>
          {staff && (
            <Button size="sm" onClick={exportPdf} loading={exporting}>
              <Download size={14} /> Export PDF
            </Button>
          )}
        </div>
        {exportError && <div className="auth-banner auth-banner-error">{exportError}</div>}

        {(summary?.latestSpeechRisk || summary?.latestScreeningResult) && (
          <>
            <h4 style={{ marginTop: 18, marginBottom: 8 }}>Latest results</h4>
            {summary?.latestSpeechRisk && (
              <div className="mini-row">
                <span>{summary.latestSpeechRisk.label || 'Speech sample'} · {new Date(summary.latestSpeechRisk.date).toLocaleDateString()}</span>
                <RiskBadge level={summary.latestSpeechRisk.raw?.riskLevel} size="sm" />
              </div>
            )}
            {summary?.latestScreeningResult && (
              <div className="mini-row">
                <span>{summary.latestScreeningResult.label || 'Screening test'} · {new Date(summary.latestScreeningResult.date).toLocaleDateString()}</span>
                <span>{summary.latestScreeningResult.raw?.scorePercentage != null ? `${summary.latestScreeningResult.raw.scorePercentage}%` : '—'}</span>
              </div>
            )}
          </>
        )}

        {staff && report.flaggedRiskPeriods?.length > 0 && (
          <>
            <h4 style={{ marginTop: 18, marginBottom: 8 }}>Flagged risk periods</h4>
            {report.flaggedRiskPeriods.map((p, i) => (
              <div className="mini-row" key={p.mediaSessionId || i}>
                <span>{p.date ? new Date(p.date).toLocaleDateString() : '—'}{p.assessmentTag ? ` · ${p.assessmentTag}` : ''}</span>
                <RiskBadge level={p.riskLevel} size="sm" />
              </div>
            ))}
          </>
        )}

        {staff && report.screeningAttempts?.length > 0 && (
          <>
            <h4 style={{ marginTop: 18, marginBottom: 8 }}>Screening scores</h4>
            {report.screeningAttempts.map((a) => (
              <div className="mini-row" key={a.id}>
                <span>{a.test?.title || 'Screening test'}</span>
                <span>{a.scorePercentage != null ? `${a.scorePercentage}%` : `${a.totalScore ?? '—'}`}</span>
              </div>
            ))}
          </>
        )}

        <div className="disclaimer-strip">
          Risk levels reflect a transparent heuristic built on real extracted speech and screening data — this is a
          screening aid, not a clinical diagnosis.
        </div>
      </Card>

      <DocumentsCard patient={patient} />

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Clinical notes</h3>
          {staff && <Button size="sm" onClick={() => setShowNote(true)}><Plus size={14} /> Add note</Button>}
        </div>
        {notesQuery.isLoading && <LoadingState rows={2} />}
        {notesQuery.data?.length === 0 && <p className="field-hint">No notes to show.</p>}
        {notesQuery.data?.map((n) => (
          <div className="list-row" key={n.id} style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13.5 }}>{n.body || n.content}</p>
              <div className="field-hint" style={{ marginTop: 4 }}>
                {n.author ? `${n.author.firstName} ${n.author.lastName} · ` : ''}{new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
            {n.visibleToFamily === false && <Badge tone="neutral">Staff only</Badge>}
          </div>
        ))}
      </Card>

      {showNote && (
        <AddNoteModal
          onClose={() => setShowNote(false)}
          onCreate={async (body) => {
            await reportService.createNote(patient.id, body);
            setShowNote(false);
            qc.invalidateQueries({ queryKey: ['notes', patient.id] });
          }}
        />
      )}
    </div>
  );
}

function AddNoteModal({ onClose, onCreate }) {
  const [body, setBody] = useState('');
  const [visibleToFamily, setVisibleToFamily] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate({ body, visibleToFamily });
    } catch (err) {
      setError(err.message || 'Could not add the note.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Add clinical note</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="Note"><textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></FormRow>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, marginBottom: 16 }}>
            <input type="checkbox" checked={visibleToFamily} onChange={(e) => setVisibleToFamily(e.target.checked)} />
            Visible to family/caretaker
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Save note</Button>
          </div>
        </form>
      </div>
    </div>
  );
}


function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsCard({ patient }) {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const docsQuery = useQuery({ queryKey: ['documents', patient.id], queryFn: () => documentService.list(patient.id) });

  const openDocument = async (doc) => {
    setError('');
    try {
      const { url, revoke } = await documentService.fetchDownloadUrl(doc.url);
      window.open(url, '_blank');
      setTimeout(revoke, 60000);
    } catch (err) {
      setError(err.message || 'Could not open that document.');
    }
  };

  const removeDocument = async (doc) => {
    if (!window.confirm(`Remove "${doc.title}"?`)) return;
    await documentService.remove(patient.id, doc.id);
    qc.invalidateQueries({ queryKey: ['documents', patient.id] });
  };

  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Attached reports</h3>
          <p className="field-hint" style={{ margin: '4px 0 0' }}>Old or external reports, lab results, or scans — kept in one place with everything else.</p>
        </div>
        <Button size="sm" onClick={() => setShowUpload(true)}><Upload size={14} /> Attach a file</Button>
      </div>
      {error && <div className="auth-banner auth-banner-error">{error}</div>}
      {docsQuery.isLoading && <LoadingState rows={2} />}
      {docsQuery.data?.length === 0 && <p className="field-hint">No attached reports yet.</p>}
      {docsQuery.data?.map((d) => (
        <div className="list-row" key={d.id}>
          <button
            type="button"
            onClick={() => openDocument(d)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <FileText size={18} />
            <div>
              <div style={{ fontWeight: 600 }}>{d.title}</div>
              <div className="field-hint">
                {formatBytes(d.fileSizeBytes)} · {new Date(d.createdAt).toLocaleDateString()}
                {d.uploadedBy ? ` · ${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : ''}
              </div>
            </div>
          </button>
          <Button size="sm" variant="ghost" onClick={() => removeDocument(d)}><Trash2 size={13} /></Button>
        </div>
      ))}

      {showUpload && (
        <UploadDocumentModal
          onClose={() => setShowUpload(false)}
          onUpload={async (payload) => {
            await documentService.upload(patient.id, payload);
            setShowUpload(false);
            qc.invalidateQueries({ queryKey: ['documents', patient.id] });
          }}
        />
      )}
    </Card>
  );
}

function UploadDocumentModal({ onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Choose a file first.'); return; }
    setLoading(true);
    setError('');
    try {
      await onUpload({ file, title });
    } catch (err) {
      setError(err.message || 'Could not upload that file.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Attach a report</h3>
        {error && <div className="auth-banner auth-banner-error">{error}</div>}
        <form onSubmit={submit}>
          <FormRow label="File" hint="PDF, Word document, or an image (JPG/PNG/WEBP/HEIC), up to 25MB">
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f && !title) setTitle(f.name);
              }}
            />
          </FormRow>
          <FormRow label="Title (optional)"><input value={title} onChange={(e) => setTitle(e.target.value)} /></FormRow>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Upload</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
