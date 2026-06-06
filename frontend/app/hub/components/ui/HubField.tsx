import { hubInput, hubLabel } from '@/lib/hub-styles';

type HubFieldProps = {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
};

export default function HubField({ label, hint, children }: HubFieldProps) {
  const hintIsString = typeof hint === 'string';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className={hubLabel}>{label}</label>
        {hint && !hintIsString ? hint : null}
      </div>
      {hint && hintIsString && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function HubTextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${hubInput} ${props.className ?? ''}`} />;
}
