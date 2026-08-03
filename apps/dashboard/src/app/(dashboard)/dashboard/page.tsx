'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard, KpiCardSkeleton } from '@/components/ui/kpi-card';
import { cn } from '@/lib/utils';
import { useAlerts, useClassesComparison, useOverview, useTrend } from '@/lib/hooks/useDashboard';
import { useDashboardStream } from '@/lib/realtime/useDashboardStream';

const TREND_PERIODS = [
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: '30 derniers jours' },
] as const;

type TrendPeriod = (typeof TREND_PERIODS)[number]['value'];

export default function DashboardOverviewPage() {
  const status = useDashboardStream();
  const overview = useOverview();
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week');
  const trend = useTrend(trendPeriod);
  const classes = useClassesComparison();
  const alerts = useAlerts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Vue d&apos;ensemble</h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            status === 'live' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {status === 'live' ? 'Temps réel actif' : status === 'connecting' ? 'Connexion...' : 'Hors ligne'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Élèves inscrits" value={overview.data?.totalStudents ?? 0} icon={Users} tone="blue" />
            <KpiCard label="Présents" value={overview.data?.presentCount ?? 0} icon={CheckCircle2} tone="emerald" />
            <KpiCard label="En retard" value={overview.data?.lateCount ?? 0} icon={Clock} tone="amber" />
            <KpiCard label="Absents" value={overview.data?.absentCount ?? 0} icon={XCircle} tone="red" />
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-700">
            Taux de présence — {TREND_PERIODS.find((p) => p.value === trendPeriod)?.label}
          </h2>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {TREND_PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setTrendPeriod(p.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  trendPeriod === p.value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                {p.value === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend.data ?? []}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={trendPeriod === 'month' ? 4 : 0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Comparaison des classes</h2>
          <div className="space-y-2">
            {(classes.data ?? []).map((c) => (
              <div key={c.schoolClassId} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">{c.name}</span>
                <span className="text-zinc-500">
                  {c.presentCount}/{c.totalStudents} ({c.rate}%)
                </span>
              </div>
            ))}
            {classes.data?.length === 0 && <p className="text-sm text-zinc-400">Aucune classe.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Alertes</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Absences non justifiées</p>
              {(alerts.data?.unjustifiedAbsences ?? []).slice(0, 5).map((a) => (
                <p key={a.absenceId} className="text-sm text-zinc-700">
                  {a.firstName} {a.lastName} — {a.date}
                </p>
              ))}
              {alerts.data?.unjustifiedAbsences.length === 0 && <p className="text-sm text-zinc-400">Aucune.</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Retards répétés</p>
              {(alerts.data?.repeatedLateness ?? []).slice(0, 5).map((s) => (
                <p key={s.studentId} className="text-sm text-zinc-700">
                  {s.firstName} {s.lastName} — {s.lateCount} retards
                </p>
              ))}
              {alerts.data?.repeatedLateness.length === 0 && <p className="text-sm text-zinc-400">Aucun.</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Absences consécutives</p>
              {(alerts.data?.consecutiveAbsences ?? []).slice(0, 5).map((s) => (
                <p key={s.studentId} className="text-sm text-zinc-700">
                  {s.studentName} ({s.schoolClassName}) — {s.consecutiveAbsences} jours d&apos;affilée
                </p>
              ))}
              {alerts.data?.consecutiveAbsences.length === 0 && <p className="text-sm text-zinc-400">Aucune.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
