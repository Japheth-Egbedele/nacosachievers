import Image from 'next/image';
import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-hub-border)] bg-[var(--color-hub-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]">
              <Image
                src="/image.png"
                alt="NACOS"
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl object-contain"
              />
              <span className="hub-display text-xl text-[var(--color-hub-text)]">NACOS Achievers</span>
            </Link>
            <p className="text-sm leading-relaxed text-[var(--color-hub-text-secondary)]">
              Nigeria Association of Computing Students (NACOS) — Achievers University Chapter.
              Affiliated with the NACOS National Secretariat.
            </p>
          </div>

          <div className="max-w-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
              Regulatory clearance
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-hub-text-secondary)]">
              Recognised computing students&apos; association chapter operating under NACOS National
              guidelines and Achievers University student affairs policies.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--color-hub-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--color-hub-muted)]">
            © {year} Nigeria Association of Computing Students — Achievers University Chapter. All
            rights reserved.
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            <Link href="/hub/login" className="hub-link">
              The Hub
            </Link>
            <Link href="/hub/register" className="hub-link">
              Register
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
