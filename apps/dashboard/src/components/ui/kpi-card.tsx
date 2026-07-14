import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
};

export function KpiCard({ label, value, icon: Icon, iconColor = 'text-blue-600' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={cn('p-2.5 rounded-lg bg-slate-50', iconColor)}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
        <div className="h-7 w-16 rounded bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}
