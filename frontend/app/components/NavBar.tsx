import Link from 'next/link';
import BrandLogo from './BrandLogo';

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <BrandLogo href="/" size="md" />
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            Home
          </Link>
          <Link
            href="/hub/login"
            className="rounded-full bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700"
          >
            The Hub
          </Link>
        </nav>
      </div>
    </header>
  );
}
