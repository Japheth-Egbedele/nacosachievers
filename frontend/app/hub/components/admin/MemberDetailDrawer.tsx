'use client';

import HubDrawer from '@/app/hub/components/ui/HubDrawer';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { ADMIN_SCOPES, type AdminScope } from '@/lib/executive-offices';

export type MemberDetail = {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  level?: string | null;
  year_of_admission?: number | null;
  expected_graduation_year?: number | null;
  actual_graduation_year?: number | null;
  academic_status: string;
  is_active: boolean;
  admin_scopes?: AdminScope[];
  first_name: string;
  last_name: string;
};

type MemberDetailDrawerProps = {
  member: MemberDetail | null;
  open: boolean;
  busy?: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
};

export default function MemberDetailDrawer({
  member,
  open,
  busy,
  isSuperAdmin,
  onClose,
  onSave,
}: MemberDetailDrawerProps) {
  if (!member) return null;

  return (
    <HubDrawer open={open} onClose={onClose} title="Member details">
      <div className="space-y-4 p-4">
        <div>
          <p className="text-lg font-semibold">
            {member.first_name} {member.last_name}
          </p>
          <p className="font-mono text-xs text-zinc-500">{member.matric_number}</p>
          <p className="text-sm text-zinc-600">{member.email}</p>
        </div>

        {isSuperAdmin ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
              const academic_status = (form.elements.namedItem('academic_status') as HTMLSelectElement)
                .value;
              const year_of_admission = (
                form.elements.namedItem('year_of_admission') as HTMLInputElement
              ).value;
              const expected_graduation_year = (
                form.elements.namedItem('expected_graduation_year') as HTMLInputElement
              ).value;
              const scopes = ADMIN_SCOPES.filter(
                (scope) =>
                  (form.elements.namedItem(`scope-${scope}`) as HTMLInputElement)?.checked,
              );
              onSave({
                role,
                academic_status,
                ...(year_of_admission
                  ? { year_of_admission: parseInt(year_of_admission, 10) }
                  : {}),
                ...(expected_graduation_year
                  ? { expected_graduation_year: parseInt(expected_graduation_year, 10) }
                  : {}),
                ...(member.role === 'executive' ? { admin_scopes: scopes } : {}),
              });
            }}
          >
            <HubField label="Role">
              <select
                name="role"
                defaultValue={member.role}
                className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
              >
                <option value="member">Member</option>
                <option value="alumni">Alumni</option>
                <option value="executive">Executive</option>
                <option value="staff">Staff</option>
                <option value="super_admin">Super admin</option>
              </select>
            </HubField>
            <HubField label="Academic status">
              <select
                name="academic_status"
                defaultValue={member.academic_status}
                className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
              </select>
            </HubField>
            <HubField label="Year of admission">
              <HubTextInput
                name="year_of_admission"
                type="number"
                defaultValue={member.year_of_admission ?? ''}
                placeholder="e.g. 2023"
              />
            </HubField>
            <HubField label="Expected graduation year">
              <HubTextInput
                name="expected_graduation_year"
                type="number"
                defaultValue={member.expected_graduation_year ?? ''}
                placeholder="e.g. 2027"
              />
            </HubField>
            {member.role === 'executive' && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Admin scopes</legend>
                {ADMIN_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`scope-${scope}`}
                      defaultChecked={member.admin_scopes?.includes(scope)}
                      className="rounded border-zinc-300"
                    />
                    {scope}
                  </label>
                ))}
              </fieldset>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className={`${hubBtnSecondary} flex-1`}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={`${hubBtnPrimary} flex-1`}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-zinc-600">
            Level: {member.level ? `L${member.level}` : 'Unassigned'} · Status:{' '}
            {member.academic_status}
          </p>
        )}
      </div>
    </HubDrawer>
  );
}
