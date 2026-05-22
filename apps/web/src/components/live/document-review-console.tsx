'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import {
  jsonBody,
  liveApiRequest,
  multipartBody,
  type LiveApiOptions,
} from '../../lib/live-api.js';
import { StatusBadge } from '../phase14/status-badge.js';

type IdentityDocumentType =
  | 'birth_certificate'
  | 'citizenship'
  | 'school_id'
  | 'medical'
  | 'eligibility_form';

type IdentityDocumentStatus =
  | 'uploaded'
  | 'review_required'
  | 'verified'
  | 'rejected'
  | 'correction_requested'
  | 'expired';

type ExtractedIdentityFields = {
  fullName?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  gender?: string;
  schoolName?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
};

type IdentityDocument = {
  id: string;
  schoolId: string;
  athleteId: string;
  documentType: IdentityDocumentType;
  status: IdentityDocumentStatus;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  malwareScanStatus: string;
  extractedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

type DocumentExtraction = {
  id: string;
  provider: string;
  extracted: ExtractedIdentityFields;
  fieldConfidence: Partial<Record<keyof ExtractedIdentityFields, number>>;
  confidence: number;
  createdAt: string;
};

type DocumentReviewFlag = {
  id: string;
  field: keyof ExtractedIdentityFields | 'document';
  severity: 'low' | 'medium' | 'high';
  message: string;
};

type DuplicateCandidate = {
  id: string;
  matchedDocumentId: string;
  matchedAthleteId: string;
  score: number;
  reasonCodes: string[];
  status: 'open' | 'dismissed';
};

type ReviewQueueItem = {
  document: IdentityDocument;
  extraction?: DocumentExtraction;
  reviewFlags: DocumentReviewFlag[];
  duplicateCandidates: DuplicateCandidate[];
};

type OcrPreview = {
  documentType: IdentityDocumentType;
  extracted: ExtractedIdentityFields;
  confidence: number;
};

const documentTypes: Array<{ label: string; value: IdentityDocumentType }> = [
  { label: 'Birth certificate', value: 'birth_certificate' },
  { label: 'Citizenship', value: 'citizenship' },
  { label: 'School ID', value: 'school_id' },
  { label: 'Medical', value: 'medical' },
  { label: 'Eligibility form', value: 'eligibility_form' },
];

const reviewStatuses: IdentityDocumentStatus[] = [
  'uploaded',
  'review_required',
  'verified',
  'correction_requested',
  'rejected',
  'expired',
];

const defaultDocumentText =
  'Name: Aarav Rai\nDOB: 2012-04-15\nDocument No: BIRTH-2042-991\nExpiry: 2026-12-31\nSchool: Live School Academy';

export function DocumentReviewConsole({ requestOptions }: { requestOptions: LiveApiOptions }) {
  const [form, setForm] = useState({
    athleteId: '',
    schoolId: '',
    documentType: 'birth_certificate' as IdentityDocumentType,
    documentText: defaultDocumentText,
    status: 'review_required' as IdentityDocumentStatus,
    reviewNotes: 'Reviewed in the school-admin document workspace.',
    reviewReason: 'Fields do not match submitted athlete profile.',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OcrPreview | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<IdentityDocument | null>(null);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<IdentityDocument[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Preview OCR, upload a file, then extract for review.');
  const [error, setError] = useState('');

  const actorRole = requestOptions.session?.user?.role ?? requestOptions.devActor?.role ?? '';
  const canFinalize = actorRole === 'super_admin';
  const firstQueueItem = queue[0];
  const duplicateSummary = duplicates.length
    ? duplicates
    : (firstQueueItem?.duplicateCandidates ?? []);
  const confidence = preview?.confidence ?? firstQueueItem?.extraction?.confidence;

  const expirationLabel = useMemo(() => {
    const expiresAt = uploadedDocument?.expiresAt ?? firstQueueItem?.document.expiresAt;
    if (!expiresAt) {
      return 'No expiration date captured';
    }
    return Date.parse(expiresAt) < Date.now() ? 'Expired' : `Expires ${formatDate(expiresAt)}`;
  }, [firstQueueItem, uploadedDocument]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setNotice(label);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Document request failed');
    } finally {
      setBusy(false);
    }
  };

  const runOcrPreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction('OCR preview extracted from text.', async () => {
      const result = await liveApiRequest<OcrPreview>(
        '/documents/ocr/extract',
        jsonBody({
          documentType: form.documentType,
          documentText: form.documentText,
        }),
        requestOptions,
      );
      setPreview(result);
    });
  };

  const uploadAndExtract = async () => {
    if (!form.athleteId.trim()) {
      setError('Athlete ID is required before upload.');
      return;
    }

    await runAction('Document uploaded and sent to the review queue.', async () => {
      const formData = new FormData();
      formData.append('documentType', form.documentType);
      formData.append(
        'file',
        selectedFile ??
          new Blob([form.documentText], {
            type: 'text/plain',
          }),
        selectedFile?.name ?? `${form.documentType}-ocr-preview.txt`,
      );

      const document = await liveApiRequest<IdentityDocument>(
        `/documents/athletes/${form.athleteId}/upload`,
        multipartBody(formData),
        requestOptions,
      );
      setUploadedDocument(document);

      const extracted = await liveApiRequest<ReviewQueueItem>(
        `/documents/${document.id}/extract`,
        jsonBody({ documentText: form.documentText }),
        requestOptions,
      );
      setQueue((current) => [
        extracted,
        ...current.filter((item) => item.document.id !== extracted.document.id),
      ]);
      await loadDuplicates(extracted.document.id);
    });
  };

  const loadReviewWorkspace = async () => {
    await runAction('Document review queue refreshed.', async () => {
      const query = new URLSearchParams();
      if (form.schoolId.trim()) {
        query.set('schoolId', form.schoolId.trim());
      }
      if (form.status) {
        query.set('status', form.status);
      }
      const before = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const expiringQuery = new URLSearchParams({ before });
      if (form.schoolId.trim()) {
        expiringQuery.set('schoolId', form.schoolId.trim());
      }

      const [nextQueue, nextExpiring] = await Promise.all([
        liveApiRequest<ReviewQueueItem[]>(
          `/documents/review-queue${query.size ? `?${query.toString()}` : ''}`,
          {},
          requestOptions,
        ),
        liveApiRequest<IdentityDocument[]>(
          `/documents/expiring?${expiringQuery.toString()}`,
          {},
          requestOptions,
        ),
      ]);
      setQueue(nextQueue);
      setExpiringDocuments(nextExpiring);
      if (nextQueue[0]) {
        await loadDuplicates(nextQueue[0].document.id);
      } else {
        setDuplicates([]);
      }
    });
  };

  const loadDuplicates = async (documentId: string) => {
    const result = await liveApiRequest<DuplicateCandidate[]>(
      `/documents/${documentId}/duplicates`,
      {},
      requestOptions,
    );
    setDuplicates(result);
  };

  const reviewDocument = async (
    documentId: string,
    action: 'approve' | 'reject' | 'request_correction',
  ) => {
    await runAction(`Document review action recorded: ${action}.`, async () => {
      const body =
        action === 'request_correction'
          ? { action, notes: form.reviewNotes, reason: form.reviewReason }
          : { action, notes: form.reviewNotes };
      const result = await liveApiRequest<{ document: IdentityDocument }>(
        `/documents/${documentId}/reviews`,
        jsonBody(body),
        requestOptions,
      );
      setQueue((current) =>
        current.map((item) =>
          item.document.id === result.document.id ? { ...item, document: result.document } : item,
        ),
      );
    });
  };

  return (
    <section className="ops-panel live-form">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OCR workspace</p>
          <h2>Document Verification</h2>
          <p>Preview OCR, upload athlete documents, extract fields, and triage review work.</p>
        </div>
        <button
          className="secondary-action"
          disabled={busy}
          onClick={() => void loadReviewWorkspace()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
          Refresh queue
        </button>
      </div>

      <div className="live-status-bar" aria-live="polite">
        <div>
          <FileSearch aria-hidden="true" size={18} />
          <span>
            {confidence === undefined
              ? 'Confidence pending'
              : `${asPercent(confidence)} confidence`}
          </span>
        </div>
        <div>
          <Clock3 aria-hidden="true" size={18} />
          <span>{expirationLabel}</span>
        </div>
        {error ? (
          <div className="live-status-bar__error">
            <AlertTriangle aria-hidden="true" size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div>
            <FileText aria-hidden="true" size={18} />
            <span>{notice}</span>
          </div>
        )}
      </div>

      <div className="two-column">
        <form className="live-form" onSubmit={runOcrPreview}>
          <label>
            Athlete ID
            <input
              className="live-input"
              onChange={(event) => setForm({ ...form, athleteId: event.target.value })}
              placeholder="ath_..."
              value={form.athleteId}
            />
          </label>
          <label>
            School ID filter
            <input
              className="live-input"
              onChange={(event) => setForm({ ...form, schoolId: event.target.value })}
              placeholder="school_..."
              value={form.schoolId}
            />
          </label>
          <label>
            Document type
            <select
              className="live-input"
              onChange={(event) =>
                setForm({
                  ...form,
                  documentType: event.target.value as IdentityDocumentType,
                })
              }
              value={form.documentType}
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            File
            <input
              className="live-input"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <label>
            OCR source text
            <textarea
              className="live-input"
              onChange={(event) => setForm({ ...form, documentText: event.target.value })}
              rows={7}
              value={form.documentText}
            />
          </label>
          <div className="live-action-group">
            <button className="secondary-action" disabled={busy} type="submit">
              <FileSearch aria-hidden="true" size={18} />
              OCR Preview
            </button>
            <button
              className="primary-action"
              disabled={busy}
              onClick={() => void uploadAndExtract()}
              type="button"
            >
              <Upload aria-hidden="true" size={18} />
              Upload and extract
            </button>
          </div>
        </form>

        <div className="live-form">
          <div>
            <h3>Extracted Fields</h3>
            <FieldList
              fields={preview?.extracted ?? firstQueueItem?.extraction?.extracted ?? {}}
              confidence={firstQueueItem?.extraction?.fieldConfidence ?? {}}
            />
          </div>
          <div>
            <h3>Duplicate Candidates</h3>
            <DuplicateList duplicates={duplicateSummary} />
          </div>
        </div>
      </div>

      <div className="two-column">
        <div>
          <div className="section-heading">
            <div>
              <h2>Review Queue</h2>
              <p>{queue.length} documents match the current filter</p>
            </div>
            <select
              className="live-input"
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as IdentityDocumentStatus })
              }
              value={form.status}
            >
              {reviewStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <ul className="live-record-list">
            {queue.length ? (
              queue.map((item) => (
                <li key={item.document.id}>
                  <span>
                    <strong>{item.document.originalFilename}</strong>
                    <small>
                      {item.document.athleteId} · {item.document.documentType} ·{' '}
                      {item.reviewFlags.length} flags · {item.duplicateCandidates.length} duplicates
                    </small>
                    <ReviewFlags flags={item.reviewFlags} />
                  </span>
                  <span className="live-row__actions">
                    <StatusBadge status={item.document.status} />
                    <button
                      className="icon-button"
                      disabled={busy || !canFinalize}
                      onClick={() => void reviewDocument(item.document.id, 'approve')}
                      title={
                        canFinalize
                          ? 'Approve extracted identity fields'
                          : 'Only super admins can approve documents'
                      }
                      type="button"
                    >
                      <CheckCircle2 aria-hidden="true" size={16} />
                      Approve
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      onClick={() => void reviewDocument(item.document.id, 'request_correction')}
                      type="button"
                    >
                      Request correction
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy || !canFinalize}
                      onClick={() => void reviewDocument(item.document.id, 'reject')}
                      title={
                        canFinalize
                          ? 'Reject this identity document'
                          : 'Only super admins can reject documents'
                      }
                      type="button"
                    >
                      <XCircle aria-hidden="true" size={16} />
                      Reject
                    </button>
                  </span>
                </li>
              ))
            ) : (
              <li>
                <span>
                  <strong>No documents loaded</strong>
                  <small>Refresh the queue after uploading or extracting a document.</small>
                </span>
                <span className="live-row__actions">
                  <button className="icon-button" disabled type="button">
                    <CheckCircle2 aria-hidden="true" size={16} />
                    Approve
                  </button>
                  <button className="icon-button" disabled type="button">
                    Request correction
                  </button>
                  <button className="icon-button" disabled type="button">
                    <XCircle aria-hidden="true" size={16} />
                    Reject
                  </button>
                </span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <div className="section-heading">
            <div>
              <h2>Expiring Documents</h2>
              <p>{expiringDocuments.length} verified or pending documents expire within 30 days</p>
            </div>
          </div>
          <ul className="live-record-list">
            {expiringDocuments.length ? (
              expiringDocuments.map((document) => (
                <li key={document.id}>
                  <span>
                    <strong>{document.originalFilename}</strong>
                    <small>
                      {document.athleteId} · {formatDate(document.expiresAt)} ·{' '}
                      {document.documentType}
                    </small>
                  </span>
                  <StatusBadge status={document.status} />
                </li>
              ))
            ) : (
              <li>
                <span>
                  <strong>No expiration alerts loaded</strong>
                  <small>Refresh queue checks `/documents/expiring` for the next 30 days.</small>
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FieldList({
  confidence,
  fields,
}: {
  confidence: Partial<Record<keyof ExtractedIdentityFields, number>>;
  fields: ExtractedIdentityFields;
}) {
  const entries = Object.entries(fields).filter(([, value]) => Boolean(value));

  if (!entries.length) {
    return <p className="live-row__meta">Run OCR Preview or extract an uploaded document.</p>;
  }

  return (
    <ul className="live-record-list">
      {entries.map(([field, value]) => (
        <li key={field}>
          <span>
            <strong>{humanize(field)}</strong>
            <small>{value}</small>
          </span>
          <span className="live-row__meta">
            {confidence[field as keyof ExtractedIdentityFields] === undefined
              ? 'preview'
              : asPercent(confidence[field as keyof ExtractedIdentityFields])}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DuplicateList({ duplicates }: { duplicates: DuplicateCandidate[] }) {
  if (!duplicates.length) {
    return <p className="live-row__meta">No duplicate candidates surfaced yet.</p>;
  }

  return (
    <ul className="live-record-list">
      {duplicates.map((duplicate) => (
        <li key={duplicate.id}>
          <span>
            <strong>{duplicate.matchedAthleteId}</strong>
            <small>
              {duplicate.matchedDocumentId} · {duplicate.reasonCodes.join(', ')}
            </small>
          </span>
          <span className="live-row__meta">{asPercent(duplicate.score)}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewFlags({ flags }: { flags: DocumentReviewFlag[] }) {
  if (!flags.length) {
    return null;
  }

  return (
    <small>
      {flags.map((flag) => `${flag.severity}: ${flag.field} ${flag.message}`).join(' · ')}
    </small>
  );
}

function asPercent(value: number | undefined) {
  if (value === undefined) {
    return 'n/a';
  }
  return `${Math.round(value * 100)}%`;
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string | undefined) {
  if (!value) {
    return 'date pending';
  }
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
