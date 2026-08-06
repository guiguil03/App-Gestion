'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AttendanceHistoryEntry } from '@/types/reports';

const WEEKS_SHOWN = 12;

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // dimanche compte comme fin de la semaine précédente
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  const monday = mondayOf(date);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function weekLabel(key: string): string {
  const [, month, day] = key.split('-');
  return `${day}/${month}`;
}

/**
 * Taux de présence par semaine (présent/en retard sur total de jours avec un
 * pointage ou une absence ce jour-là) sur les 12 dernières semaines ayant au
 * moins un jour d'école — un résumé chiffré (présences/retards/absences)
 * masque une dégradation progressive qu'une courbe rend visible d'un coup
 * d'œil.
 */
export function AttendanceTrendChart({ entries }: { entries: AttendanceHistoryEntry[] }) {
  const byWeek = new Map<string, { present: number; total: number }>();
  for (const entry of entries) {
    const key = weekKey(new Date(`${entry.date}T00:00:00`));
    const bucket = byWeek.get(key) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (entry.status !== 'ABSENT') bucket.present += 1;
    byWeek.set(key, bucket);
  }

  const weeks = [...byWeek.keys()].sort().slice(-WEEKS_SHOWN);
  const data = weeks.map((key) => {
    const bucket = byWeek.get(key)!;
    return { week: weekLabel(key), rate: Math.round((bucket.present / bucket.total) * 100) };
  });

  if (data.length === 0) {
    return <p className="text-sm text-zinc-400">Pas encore assez d&apos;historique pour une courbe de tendance.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
        <Tooltip formatter={(value: number) => [`${value}%`, 'Présence']} labelFormatter={(label) => `Semaine du ${label}`} />
        <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
