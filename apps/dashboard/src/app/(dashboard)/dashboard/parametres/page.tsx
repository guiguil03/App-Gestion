'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAttendanceSettings, useUpdateAttendanceSettings } from '@/lib/hooks/useSettings';

type FormValues = {
  scanWindowStart: string;
  scanWindowEnd: string;
  attendanceReferenceTime: string;
  attendanceToleranceMinutes: string;
};

export default function ParametresPage() {
  const settings = useAttendanceSettings();
  const updateSettings = useUpdateAttendanceSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      scanWindowStart: '',
      scanWindowEnd: '',
      attendanceReferenceTime: '',
      attendanceToleranceMinutes: '',
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    reset({
      scanWindowStart: settings.data.scanWindowStart ?? '',
      scanWindowEnd: settings.data.scanWindowEnd ?? '',
      attendanceReferenceTime: settings.data.attendanceReferenceTime,
      attendanceToleranceMinutes: String(settings.data.attendanceToleranceMinutes),
    });
  }, [settings.data, reset]);

  async function onSubmit(values: FormValues) {
    setSaved(false);
    setError(null);

    if (!values.attendanceReferenceTime.trim()) {
      setError("L'heure de référence est obligatoire.");
      return;
    }
    const tolerance = Number(values.attendanceToleranceMinutes);
    if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 180) {
      setError('La tolérance doit être un nombre entier de minutes entre 0 et 180.');
      return;
    }

    const hasStart = values.scanWindowStart.trim() !== '';
    const hasEnd = values.scanWindowEnd.trim() !== '';
    if (hasStart !== hasEnd) {
      setError('Renseigne les deux heures (début et fin), ou aucune pour désactiver la restriction.');
      return;
    }

    await updateSettings.mutateAsync({
      scanWindowStart: hasStart ? values.scanWindowStart : null,
      scanWindowEnd: hasEnd ? values.scanWindowEnd : null,
      attendanceReferenceTime: values.attendanceReferenceTime,
      attendanceToleranceMinutes: tolerance,
    });
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Paramètres</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Heure de référence et tolérance</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Heure à partir de laquelle un pointage est considéré en retard, et à partir de laquelle un élève sans
            pointage est marqué absent (après application de la tolérance ci-dessous).
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Heure de référence</label>
              <input
                type="time"
                {...register('attendanceReferenceTime')}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Tolérance (minutes)</label>
              <input
                type="number"
                min={0}
                max={180}
                step={1}
                {...register('attendanceToleranceMinutes')}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <h2 className="text-sm font-semibold text-zinc-700">Plage horaire de pointage</h2>
          <p className="text-xs text-zinc-500 mt-1">
            En dehors de cette plage, aucun pointage n&apos;est enregistré. Indépendant de l&apos;heure de référence
            retard/absence. Laisse les deux champs vides pour désactiver cette restriction.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Début</label>
              <input type="time" {...register('scanWindowStart')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Fin</label>
              <input type="time" {...register('scanWindowEnd')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-emerald-600">Paramètres enregistrés.</p>}

        <button
          type="submit"
          disabled={updateSettings.isPending}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
