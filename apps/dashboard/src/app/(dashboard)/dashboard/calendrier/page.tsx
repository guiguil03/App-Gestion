'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { useAddSchoolEvent, useRemoveSchoolEvent, useSchoolEvents } from '@/lib/hooks/useSchool';
import type { SchoolEvent } from '@/types/school';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Grille de 42 jours (6 semaines, lundi en premier) couvrant le mois
 * demandé, débordant sur le mois précédent/suivant pour compléter la
 * première/dernière semaine — convention standard d'une vue calendrier. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // dimanche (0) -> fin de semaine, pas début
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
}

export default function CalendrierPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const rangeStart = toDateKey(days[0]);
  const rangeEnd = toDateKey(days[days.length - 1]);
  const events = useSchoolEvents(rangeStart, rangeEnd);
  const addEvent = useAddSchoolEvent();
  const removeEvent = useRemoveSchoolEvent();

  const eventsByDate = new Map<string, SchoolEvent[]>();
  for (const event of events.data ?? []) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  function goToPreviousMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  async function handleAddEvent() {
    if (!selectedDate || !title.trim()) return;
    await addEvent.mutateAsync({ date: selectedDate, title: title.trim(), description: description.trim() || undefined });
    setTitle('');
    setDescription('');
  }

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Calendrier</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="w-36 text-center text-sm font-medium text-zinc-700">
            {MONTH_LABELS[month]} {year}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 text-xs font-medium text-zinc-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="p-2 text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toDateKey(day);
            const isCurrentMonth = day.getMonth() === month;
            const dayEvents = eventsByDate.get(key) ?? [];
            const isSelected = selectedDate === key;
            return (
              <button
                key={key}
                type="button"
                aria-label={key}
                onClick={() => setSelectedDate(key)}
                className={`min-h-[84px] border-b border-r border-slate-100 p-1.5 text-left align-top last:border-r-0 hover:bg-zinc-50 ${
                  isCurrentMonth ? '' : 'bg-slate-50/60 text-zinc-300'
                } ${isSelected ? 'ring-2 ring-inset ring-emerald-500' : ''}`}
              >
                <span className={`text-xs ${isCurrentMonth ? 'text-zinc-600' : 'text-zinc-300'}`}>{day.getDate()}</span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <p key={event.id} className="truncate rounded bg-emerald-50 px-1 text-[10px] text-emerald-700">
                      {event.title}
                    </p>
                  ))}
                  {dayEvents.length > 2 && <p className="text-[10px] text-zinc-400">+{dayEvents.length - 2}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">{selectedDate}</h2>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {selectedEvents.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-2.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{event.title}</p>
                  {event.description && <p className="text-xs text-zinc-500">{event.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeEvent.mutate(event.id)}
                  disabled={removeEvent.isPending}
                  className="flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {selectedEvents.length === 0 && <p className="text-sm text-zinc-400">Aucun événement ce jour.</p>}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre (ex : Sortie musée)"
              className="min-w-[160px] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnel)"
              className="min-w-[160px] flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleAddEvent()}
              disabled={!title.trim() || addEvent.isPending}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {addEvent.isPending ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
