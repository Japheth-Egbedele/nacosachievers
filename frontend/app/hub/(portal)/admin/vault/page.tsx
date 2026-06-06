'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { hubBtnPrimary, hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import { getDepartments, type Department } from '@/lib/departments';

interface PendingUpload {
  id: string;
  title: string;
  status: string;
  created_at: string;
  users?: { matric_number?: string; display_name?: string };
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  level: string;
  semester?: string;
}

const vaultTabs = [
  { key: 'pending', label: 'Pending review' },
  { key: 'courses', label: 'Courses' },
  { key: 'create', label: 'Create course' },
];

export default function AdminVaultPage() {
  const [tab, setTab] = useState<'pending' | 'courses' | 'create'>('pending');
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState('');
  const [semester, setSemester] = useState<'first' | 'second' | ''>('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');

  const loadPending = () => {
    apiFetch<PendingUpload[]>('/vault/pending')
      .then(setPending)
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  };

  const loadCourses = () => {
    setLoading(true);
    apiFetchPaginated<Course>('/vault/courses?limit=100')
      .then((r) => setCourses(r.items))
      .catch(() => setCourses([]))
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
    else setLoading(false);
  }, [tab]);

  async function review(id: string, status: 'approved' | 'rejected') {
    setError('');
    try {
      await apiFetch(`/vault/uploads/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadPending();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Review failed');
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

  return (
    <div>
      <AdminPageHeader title="Vault" description="Review pending uploads and manage courses." />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      {success && <HubAlert variant="success" className="mb-4">{success}</HubAlert>}
      <HubPillTabs
        tabs={vaultTabs}
        active={tab}
        onChange={(k) => setTab(k as 'pending' | 'courses' | 'create')}
      />
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
                      {u.users?.display_name ?? u.users?.matric_number ?? 'Member'} · {u.status}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => review(u.id, 'approved')} className={hubLink}>
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
            </HubList>
          )}
          {tab === 'courses' && (
            <HubList className="mt-6">
              {courses.map((c) => (
                <HubListCard key={c.id} className="block">
                  <span className="font-mono text-xs text-[var(--color-brand)]">{c.course_code}</span>
                  <span className="text-[var(--color-hub-text)]">
                    {' '}
                    — {c.course_name} (L{c.level}
                    {c.semester ? `, ${c.semester} sem` : ''})
                  </span>
                </HubListCard>
              ))}
              {courses.length === 0 && <HubListEmpty title="No courses yet" />}
            </HubList>
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
                  onChange={(e) => setSemester(e.target.value as 'first' | 'second' | '')}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select semester —</option>
                  <option value="first">First semester</option>
                  <option value="second">Second semester</option>
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
