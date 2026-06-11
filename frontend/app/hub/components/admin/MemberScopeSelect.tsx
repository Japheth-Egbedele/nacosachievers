import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { SCOPE_OPTIONS, type MemberScope } from '@/lib/member-stats';

type MemberScopeSelectProps = {
  value: MemberScope;
  onChange: (scope: MemberScope) => void;
  className?: string;
};

export default function MemberScopeSelect({ value, onChange, className }: MemberScopeSelectProps) {
  return (
    <HubPillTabs
      tabs={SCOPE_OPTIONS}
      active={value}
      onChange={(key) => onChange(key as MemberScope)}
      className={className}
    />
  );
}
