import Link from 'next/link';
import NavBar from './components/NavBar';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600">
          Achievers Chapter
        </p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 md:text-6xl dark:text-white">
          Something great is on the way
        </h1>
        <p className="mt-6 max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
          Our full platform is launching soon. Chapter elections and The Hub are available now for
          members.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/hub/login"
            className="rounded-full bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-emerald-700"
          >
            Enter The Hub
          </Link>
          <Link
            href="/hub/register"
            className="rounded-full border border-zinc-300 px-8 py-3 text-base font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Register with PIN
          </Link>
        </div>
      </main>
      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        © {new Date().getFullYear()} NACOS Achievers Chapter
      </footer>
    </div>
  );
}
