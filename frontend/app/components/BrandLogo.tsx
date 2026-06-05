import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  /** Optional label beside the mark (e.g. "Hub") */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'h-9 w-auto',
  md: 'h-11 w-auto',
  lg: 'h-20 w-auto',
};

export default function BrandLogo({
  href = '/',
  label,
  size = 'md',
  className = '',
}: BrandLogoProps) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo.png"
        alt="NACOS Achievers Chapter"
        width={160}
        height={64}
        className={`object-contain ${sizeClasses[size]}`}
        priority={size === 'lg'}
      />
      {label ? (
        <span className="text-base font-semibold tracking-tight text-[var(--color-brand)]">
          {label}
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      {inner}
    </Link>
  );
}
