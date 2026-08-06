'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { GlobalSearch } from '@/components/layout/global-search';
import { Sidebar } from '@/components/layout/sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-100 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-bold text-zinc-900">Présence Scolaire</span>
      </div>

      {mobileOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:ml-60">
        <div className="sticky top-0 z-20 hidden border-b border-zinc-100 bg-white/80 px-6 py-2.5 backdrop-blur lg:block">
          <GlobalSearch />
        </div>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
