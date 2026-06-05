import { hubInput, hubLabel } from '@/lib/hub-styles';

type HubFieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

export default function HubField({ label, hint, children }: HubFieldProps) {
  return (
    <div>
      <label className={hubLabel}>{label}</label>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function HubTextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${hubInput} ${props.className ?? ''}`} />;
}
