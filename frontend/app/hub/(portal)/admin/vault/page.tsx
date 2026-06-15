'use client';

import { useEffect, useMemo, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import VaultSubmissionPreview from '@/app/hub/components/vault/VaultSubmissionPreview';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubBtnPrimary, hubLink, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import { formatCourseUnits } from '@/lib/vault-format';
import { getDepartments, type Department } from '@/lib/departments';

interface PendingUpload {
  id: string;
  title: string;
  status: string;
  upload_kind?: string;
  page_count?: number;
  created_at: string;
  users?: { matric_number?: string; display_name?: string };
  files?: { id: string; file_name: string; content_mime: string }[];
}

interface TreasurySummary {
  balance: number;
  default_vault_reward: number;
  total_issued_upload_rewards: number;
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  level: string;
  semester?: string;
  units?: number | null;
}

interface VaultFlag {
  id: string;
  reason: string;
  created_at: string;
  vault_uploads?: { title?: string };
}

interface Lecturer {
  id: string;
  name: string;
  title?: string;
}

interface TeachingAssignment {
  id: string;
  semester: string;
  teaching_status: string;
  lecturers?: { name?: string; title?: string };
}

type VaultTab = 'pending' | 'courses' | 'create' | 'flags' | 'assignments';

const vaultTabs = [
  { key: 'pending', label: 'Pending review' },
  { key: 'courses', label: 'Courses' },
  { key: 'create', label: 'Create course' },
  { key: 'flags', label: 'Flags' },
  { key: 'assignments', label: 'Assignments' },
];

export default function AdminVaultPage() {
  const [tab, setTab] = useState<VaultTab>('pending');
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [flags, setFlags] = useState<VaultFlag[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [assignLecturerId, setAssignLecturerId] = useState('');
  const [assignSemester, setAssignSemester] = useState<'1' | '2'>('1');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState<'1' | '2' | ''>('');
  const [approveMode, setApproveMode] = useState<'single' | 'bulk' | null>(null);
  const [approveIds, setApproveIds] = useState<string[]>([]);
  const [approveTitle, setApproveTitle] = useState('');
  const [creditPerUpload, setCreditPerUpload] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewTarget, setPreviewTarget] = useState<PendingUpload | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseUnits, setCourseUnits] = useState('');

  const loadPending = () => {
    apiFetch<PendingUpload[]>('/vault/pending')
      .then((rows) => {
        setPending(rows);
        setSelectedIds((prev) => {
          const valid = new Set(rows.map((r) => r.id));
          return new Set([...prev].filter((id) => valid.has(id)));
        });
      })
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
    apiFetch<TreasurySummary>('/vault/treasury-summary')
      .then(setTreasury)
      .catch(() => setTreasury(null));
  };

  const loadCourses = () => {
    setLoading(true);
    apiFetchPaginated<Course>('/vault/courses?limit=100')
      .then((r) => setCourses(r.items))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  };

  const loadFlags = () => {
    setLoading(true);
    apiFetch<VaultFlag[]>('/vault/flags')
      .then(setFlags)
      .catch(() => setFlags([]))
      .finally(() => setLoading(false));
  };

  const loadLecturers = () => {
    apiFetch<Lecturer[]>('/admin/lecturers')
      .then(setLecturers)
      .catch(() => setLecturers([]));
  };

  const loadAssignments = (courseId: string) => {
    if (!courseId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    apiFetch<{ lecturers: TeachingAssignment[] }>(`/vault/courses/${courseId}`)
      .then((d) => setAssignments(d.lecturers ?? []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void getDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    setError('');
    setSuccess('');
    setLoading(true);
    if (tab === 'pending') loadPending();
    else if (tab === 'courses') loadCourses();
    else if (tab === 'flags') loadFlags();
    else if (tab === 'assignments') {
      loadCourses();
      loadLecturers();
      setLoading(false);
    } else setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (tab === 'assignments' && assignCourseId) loadAssignments(assignCourseId);
  }, [tab, assignCourseId]);

  const selectedCount = selectedIds.size;
  const allSelected = pending.length > 0 && selectedCount === pending.length;

  const approveCount = approveMode === 'bulk' ? approveIds.length : 1;
  const perUploadCredits = parseInt(creditPerUpload, 10);
  const totalCredits =
    Number.isFinite(perUploadCredits) && perUploadCredits >= 0
      ? perUploadCredits * approveCount
      : 0;

  const treasuryShortfall = useMemo(() => {
    if (!treasury) return false;
    return treasury.balance < totalCredits;
  }, [treasury, totalCredits]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pending.map((u) => u.id)));
  }

  function openApproveDialog(ids: string[], title: string, mode: 'single' | 'bulk') {
    setApproveMode(mode);
    setApproveIds(ids);
    setApproveTitle(title);
    setCreditPerUpload(String(treasury?.default_vault_reward ?? 10));
  }

  function closeApproveDialog() {
    setApproveMode(null);
    setApproveIds([]);
    setApproveTitle('');
  }

  async function confirmApprove() {
    const perUpload = parseInt(creditPerUpload, 10);
    const amount = Number.isFinite(perUpload) ? perUpload : 0;
    setReviewBusy(true);
    setError('');
    try {
      if (approveMode === 'bulk') {
        const data = await apiFetch<{
          approved: number;
          total_credits: number;
          errors?: { id: string; message: string }[];
        }>('/vault/uploads/bulk-approve', {
          method: 'POST',
          body: JSON.stringify({ upload_ids: approveIds, credit_amount: amount }),
        });
        closeApproveDialog();
        setSelectedIds(new Set());
        loadPending();
        if (data.errors?.length) {
          setError(`Approved ${data.approved}; ${data.errors.length} failed.`);
        } else {
          setSuccess(
            `Approved ${data.approved} upload${data.approved === 1 ? '' : 's'} (${data.total_credits} credits total).`,
          );
        }
      } else {
        await apiFetch(`/vault/uploads/${approveIds[0]}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved', credit_amount: amount }),
        });
        closeApproveDialog();
        loadPending();
        setSuccess('Upload approved.');
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Approval failed');
    } finally {
      setReviewBusy(false);
    }
  }

  async function deleteUpload(id: string) {
    if (!confirm('Permanently delete this submission and its files?')) return;
    setError('');
    try {
      await apiFetch(`/vault/uploads/${id}`, { method: 'DELETE' });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadPending();
      setSuccess('Submission deleted.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  }

  async function bulkDeleteSelected() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (
      !confirm(
        `Permanently delete ${ids.length} submission${ids.length === 1 ? '' : 's'} and their files?`,
      )
    ) {
      return;
    }
    setReviewBusy(true);
    setError('');
    try {
      const data = await apiFetch<{ deleted: number; errors?: { id: string; message: string }[] }>(
        '/vault/uploads/bulk-delete',
        { method: 'POST', body: JSON.stringify({ upload_ids: ids }) },
      );
      setSelectedIds(new Set());
      loadPending();
      if (data.errors?.length) {
        setError(`Deleted ${data.deleted}; ${data.errors.length} failed.`);
      } else {
        setSuccess(`Deleted ${data.deleted} submission${data.deleted === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Bulk delete failed');
    } finally {
      setReviewBusy(false);
    }
  }

  function openPreviewForSelection() {
    const id = [...selectedIds][0];
    const row = pending.find((u) => u.id === id);
    if (row) setPreviewTarget(row);
  }

  async function resolveFlag(id: string) {
    setError('');
    try {
      await apiFetch(`/vault/flags/${id}/resolve`, { method: 'PATCH' });
      loadFlags();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Resolve failed');
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm('Delete this course and its assignments?')) return;
    setError('');
    try {
      await apiFetch(`/vault/courses/${id}`, { method: 'DELETE' });
      loadCourses();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!departmentId || !level || !semester || !courseCode.trim() || !courseName.trim()) {
      setError('All fields are required');
      return;
    }
    setCreateBusy(true);
    try {
      const units = courseUnits.trim() ? parseInt(courseUnits, 10) : null;
      await apiFetch('/vault/courses', {
        method: 'POST',
        body: JSON.stringify({
          department_id: departmentId,
          level,
          semester,
          course_code: courseCode.trim().toUpperCase(),
          course_name: courseName.trim(),
          units: Number.isFinite(units) ? units : null,
        }),
      });
      setDepartmentId('');
      setLevel('');
      setSemester('');
      setCourseCode('');
      setCourseName('');
      setCourseUnits('');
      setSuccess('Course created.');
      setTab('courses');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    } finally {
      setCreateBusy(false);
    }
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!assignCourseId || !assignLecturerId) {
      setError('Select a course and lecturer');
      return;
    }
    setError('');
    try {
      await apiFetch(`/admin/vault/courses/${assignCourseId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          lecturer_id: assignLecturerId,
          semester: assignSemester,
          teaching_status: 'active',
        }),
      });
      setAssignLecturerId('');
      loadAssignments(assignCourseId);
      setSuccess('Assignment added.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Assignment failed');
    }
  }

  return (
    <div>
      <AdminPageHeader title="Vault" description="Review uploads, manage courses, flags, and teaching assignments." />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      {success && <HubAlert variant="success" className="mb-4">{success}</HubAlert>}
      <HubPillTabs tabs={vaultTabs} active={tab} onChange={(k) => setTab(k as VaultTab)} />
      {loading ? (
        <div className="mt-6">
          <SpinnerCenter />
        </div>
      ) : (
        <>
          {tab === 'pending' && (
            <div className="mt-6 space-y-4">
              {pending.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-300"
                    />
                    <span>Select all ({pending.length})</span>
                  </label>
                  {selectedCount > 0 && (
                    <>
                      <span className="text-zinc-500">{selectedCount} selected</span>
                      <button
                        type="button"
                        disabled={selectedCount !== 1 || reviewBusy}
                        onClick={openPreviewForSelection}
                        className={hubBtnSecondary}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() =>
                          openApproveDialog(
                            [...selectedIds],
                            `${selectedCount} selected uploads`,
                            'bulk',
                          )
                        }
                        className={hubBtnPrimary}
                      >
                        Approve selected
                      </button>
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => void bulkDeleteSelected()}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete selected
                      </button>
                    </>
                  )}
                </div>
              )}

              <HubList>
                {pending.length === 0 && <HubListEmpty title="No pending uploads" />}
                {pending.map((u) => (
                  <HubListCard key={u.id} className="items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelected(u.id)}
                      className="mt-1 rounded border-zinc-300"
                      aria-label={`Select ${u.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{u.title}</p>
                      <p className="text-xs text-[var(--color-hub-text-secondary)]">
                        {u.users?.display_name ?? u.users?.matric_number ?? 'Member'} ·{' '}
                        {u.upload_kind?.replace('_', ' ') ?? 'upload'}
                        {u.page_count && u.page_count > 1 ? ` · ${u.page_count} pages` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => setPreviewTarget(u)} className={hubLink}>
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => openApproveDialog([u.id], u.title, 'single')}
                        className={hubLink}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUpload(u.id)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </HubListCard>
                ))}
              </HubList>

              {approveMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <form
                    className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-900"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void confirmApprove();
                    }}
                  >
                    <h3 className="font-semibold">
                      {approveMode === 'bulk' ? 'Approve selected uploads' : 'Approve upload'}
                    </h3>
                    <p className="text-sm text-zinc-600">{approveTitle}</p>
                    <HubField label="Credits per upload">
                      <HubTextInput
                        type="number"
                        min={0}
                        max={500}
                        value={creditPerUpload}
                        onChange={(e) => setCreditPerUpload(e.target.value)}
                      />
                    </HubField>
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800">
                      <p>
                        <span className="text-zinc-500">Uploads:</span>{' '}
                        <strong>{approveCount}</strong>
                      </p>
                      <p className="mt-1">
                        <span className="text-zinc-500">Total credits:</span>{' '}
                        <strong>{totalCredits}</strong>
                        {approveCount > 1 && Number.isFinite(perUploadCredits) && (
                          <span className="text-zinc-500">
                            {' '}
                            ({perUploadCredits} × {approveCount})
                          </span>
                        )}
                      </p>
                    </div>
                    {treasury && (
                      <p className="text-xs text-zinc-500">
                        Treasury balance: {treasury.balance} credits
                        {treasuryShortfall && (
                          <span className="text-red-600"> — insufficient for this payout</span>
                        )}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={reviewBusy || treasuryShortfall}
                        className={hubBtnPrimary}
                      >
                        {reviewBusy ? 'Approving…' : 'Confirm approve'}
                      </button>
                      <button
                        type="button"
                        className={hubBtnSecondary}
                        onClick={closeApproveDialog}
                        disabled={reviewBusy}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {previewTarget && (
                <VaultSubmissionPreview
                  uploadId={previewTarget.id}
                  title={previewTarget.title}
                  onClose={() => setPreviewTarget(null)}
                />
              )}
            </div>
          )}
          {tab === 'courses' && (
            <HubList className="mt-6">
              {courses.map((c) => (
                <HubListCard key={c.id} className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-[var(--color-brand)]">{c.course_code}</span>
                    <span className="text-[var(--color-hub-text)]">
                      {' '}
                      — {c.course_name} (L{c.level}
                      {c.semester ? `, sem ${c.semester}` : ''}
                      {c.units != null ? `, ${formatCourseUnits(c.units)}` : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCourse(c.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </HubListCard>
              ))}
              {courses.length === 0 && <HubListEmpty title="No courses yet" />}
            </HubList>
          )}
          {tab === 'flags' && (
            <HubList className="mt-6">
              {flags.map((f) => (
                <HubListCard key={f.id}>
                  <div>
                    <p className="font-medium">{f.vault_uploads?.title ?? 'Upload'}</p>
                    <p className="text-sm text-zinc-600">{f.reason}</p>
                    <p className="text-xs text-zinc-500">{new Date(f.created_at).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => resolveFlag(f.id)} className={hubLink}>
                    Resolve
                  </button>
                </HubListCard>
              ))}
              {flags.length === 0 && <HubListEmpty title="No open flags" />}
            </HubList>
          )}
          {tab === 'assignments' && (
            <div className="mt-6 max-w-xl space-y-6">
              <HubField label="Course">
                <select
                  value={assignCourseId}
                  onChange={(e) => setAssignCourseId(e.target.value)}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                </select>
              </HubField>
              {assignCourseId && (
                <>
                  <ul className="space-y-2 text-sm">
                    {assignments.map((a) => (
                      <li key={a.id} className="rounded-lg border px-3 py-2">
                        {a.lecturers?.title} {a.lecturers?.name} · {a.semester} sem · {a.teaching_status}
                      </li>
                    ))}
                    {assignments.length === 0 && (
                      <li className="text-zinc-500">No lecturers assigned yet.</li>
                    )}
                  </ul>
                  <form onSubmit={addAssignment} className="space-y-3 rounded-xl border p-4">
                    <HubField label="Lecturer">
                      <select
                        required
                        value={assignLecturerId}
                        onChange={(e) => setAssignLecturerId(e.target.value)}
                        className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                      >
                        <option value="">— Select lecturer —</option>
                        {lecturers.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title ? `${l.title} ` : ''}
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </HubField>
                    <HubField label="Semester">
                      <select
                        value={assignSemester}
                        onChange={(e) => setAssignSemester(e.target.value as '1' | '2')}
                        className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                      >
                        <option value="1">First semester</option>
                        <option value="2">Second semester</option>
                      </select>
                    </HubField>
                    <button type="submit" className={hubBtnPrimary}>
                      Add assignment
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
          {tab === 'create' && (
            <form onSubmit={createCourse} className="mt-6 max-w-lg space-y-4">
              <HubField label="Department">
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </HubField>
              <HubField label="Level">
                <select
                  required
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select level —</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                </select>
              </HubField>
              <HubField label="Semester">
                <select
                  required
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as '1' | '2' | '')}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select semester —</option>
                  <option value="1">First semester</option>
                  <option value="2">Second semester</option>
                </select>
              </HubField>
              <HubField label="Course code">
                <HubTextInput
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="CSC 201"
                />
              </HubField>
              <HubField label="Course name">
                <HubTextInput
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Data Structures"
                />
              </HubField>
              <HubField label="Units" hint="Credit units (1–6). Optional.">
                <HubTextInput
                  type="number"
                  min={1}
                  max={6}
                  value={courseUnits}
                  onChange={(e) => setCourseUnits(e.target.value)}
                  placeholder="e.g. 3"
                />
              </HubField>
              <button type="submit" disabled={createBusy} className={hubBtnPrimary}>
                {createBusy ? 'Creating…' : 'Create course'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
