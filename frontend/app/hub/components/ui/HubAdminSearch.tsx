import { hubBtnPrimary, hubInput } from '@/lib/hub-styles';

type HubAdminSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonLabel?: string;
};

export default function HubAdminSearch({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search…',
  buttonLabel = 'Search',
}: HubAdminSearchProps) {
  return (
    <form
      className="mb-6 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${hubInput} flex-1`}
      />
      <button type="submit" className={`${hubBtnPrimary} w-auto shrink-0 px-5`}>
        {buttonLabel}
      </button>
    </form>
  );
}
