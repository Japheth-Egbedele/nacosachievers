'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubBtnPrimary, hubLink, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import { getDepartments, type Department } from '@/lib/departments';

interface PendingUpload {
  id: string;
  title: string;
  status: string;
  upload_kind?: string;
  page_count?: number;
  created_at: string;
  users?: { matric_number?: string; display_name?: string };
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
  const [approveTarget, setApproveTarget] = useState<PendingUpload | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');

  const loadPending = () => {
    apiFetch<PendingUpload[]>('/vault/pending')
      .then(setPending)
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

  async function review(id: string, status: 'approved' | 'rejected', amount?: number) {
    setError('');
    try {
      await apiFetch(`/vault/uploads/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          credit_amount: status === 'approved' ? amount : undefined,
        }),
      });
      setApproveTarget(null);
      loadPending();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Review failed');
    }
  }

  function openApprove(u: PendingUpload) {
    setApproveTarget(u);
    setCreditAmount(String(treasury?.default_vault_reward ?? 10));
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
      await apiFetch('/vault/courses', {
        method: 'POST',
        body: JSON.stringify({
          department_id: departmentId,
          level,
          semester,
          course_code: courseCode.trim().toUpperCase(),
          course_name: courseName.trim(),
        }),
      });
      setDepartmentId('');
      setLevel('');
      setSemester('');
      setCourseCode('');
      setCourseName('');
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
            <HubList className="mt-6">
              {pending.length === 0 && <HubListEmpty title="No pending uploads" />}
              {pending.map((u) => (
                <HubListCard key={u.id}>
                  <div>
                    <p className="font-medium">{u.title}</p>
                    <p className="text-xs text-[var(--color-hub-text-secondary)]">
                      {u.users?.display_name ?? u.users?.matric_number ?? 'Member'} ·{' '}
                      {u.upload_kind?.replace('_', ' ') ?? 'upload'}
                      {u.page_count && u.page_count > 1 ? ` · ${u.page_count} pages` : ''}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openApprove(u)} className={hubLink}>
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => review(u.id, 'rejected')}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Reject
                    </button>
                  </div>
                </HubListCard>
              ))}
              {approveTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <form
                    className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-900"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const amt = parseInt(creditAmount, 10);
                      void review(approveTarget.id, 'approved', Number.isFinite(amt) ? amt : 0);
                    }}
                  >
                    <h3 className="font-semibold">Approve upload</h3>
                    <p className="text-sm text-zinc-600">{approveTarget.title}</p>
                    {treasury && (
                      <p className="text-xs text-zinc-500">
                        Treasury balance: {treasury.balance} credits
                        {treasury.balance < parseInt(creditAmount || '0', 10) && (
                          <span className="text-red-600"> — insufficient for this payout</span>
                        )}
                      </p>
                    )}
                    <HubField label="Credits to award">
                      <HubTextInput
                        type="number"
                        min={0}
                        max={500}
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                      />
                    </HubField>
                    <div className="flex gap-2">
                      <button type="submit" className={hubBtnPrimary}>
                        Confirm approve
                      </button>
                      <button type="button" className={hubBtnSecondary} onClick={() => setApproveTarget(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </HubList>
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
                      {c.semester ? `, ${c.semester} sem` : ''})
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
