import { type LucideIcon } from 'lucide-react';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
} as const;

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
};

export function KpiCard({ label, value, icon: Icon, tone = 'blue' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 transition-shadow hover:shadow-md">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
        <div className="h-7 w-16 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}
