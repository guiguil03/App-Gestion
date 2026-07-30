'use client';

import { useState } from 'react';
import { HistoriqueTab } from '@/app/(dashboard)/dashboard/rapports/_components/historique-tab';
import { ResumeTab } from '@/app/(dashboard)/dashboard/rapports/_components/resume-tab';
import { cn } from '@/lib/utils';

const TABS = [
  { value: 'resume', label: 'Résumé' },
  { value: 'historique', label: 'Historique' },
] as const;

type Tab = (typeof TABS)[number]['value'];

export default function RapportsPage() {
  const [tab, setTab] = useState<Tab>('resume');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Rapports</h1>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resume' ? <ResumeTab /> : <HistoriqueTab />}
    </div>
  );
}
