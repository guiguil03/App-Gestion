import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-zinc-900">
            Présence Scolaire
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-500">
            <Link href="/cgu" className="hover:text-zinc-900">
              CGU
            </Link>
            <Link href="/confidentialite" className="hover:text-zinc-900">
              Confidentialité
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">{children}</div>
      </main>
    </div>
  );
}
