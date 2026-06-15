type CandidatePhotoSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<CandidatePhotoSize, string> = {
  sm: 'h-12 w-12 text-xs',
  md: 'h-16 w-16 text-sm',
  lg: 'h-20 w-20 text-base',
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type CandidatePhotoProps = {
  name: string;
  imageUrl?: string | null;
  size?: CandidatePhotoSize;
  className?: string;
};

export default function CandidatePhoto({
  name,
  imageUrl,
  size = 'md',
  className = '',
}: CandidatePhotoProps) {
  const sizeClass = sizeClasses[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`Photo of ${name}`}
        width={size === 'lg' ? 80 : size === 'md' ? 64 : 48}
        height={size === 'lg' ? 80 : size === 'md' ? 64 : 48}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-zinc-800 ${className}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 ring-2 ring-white dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-zinc-800 ${className}`}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}
