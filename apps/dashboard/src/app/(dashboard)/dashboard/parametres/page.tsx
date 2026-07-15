'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAttendanceSettings, useUpdateAttendanceSettings } from '@/lib/hooks/useSettings';
import type { GeoPoint } from '@/types/settings';

type FormValues = {
  corners: { lat: string; lng: string }[];
  scanWindowStart: string;
  scanWindowEnd: string;
};

const EMPTY_CORNERS = [
  { lat: '', lng: '' },
  { lat: '', lng: '' },
  { lat: '', lng: '' },
  { lat: '', lng: '' },
];

function toFormCorners(corners: GeoPoint[] | null): FormValues['corners'] {
  if (!corners) return EMPTY_CORNERS;
  return corners.map((c) => ({ lat: String(c.lat), lng: String(c.lng) }));
}

export default function ParametresPage() {
  const settings = useAttendanceSettings();
  const updateSettings = useUpdateAttendanceSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { corners: EMPTY_CORNERS, scanWindowStart: '', scanWindowEnd: '' },
  });

  useEffect(() => {
    if (!settings.data) return;
    reset({
      corners: toFormCorners(settings.data.geofenceCorners),
      scanWindowStart: settings.data.scanWindowStart ?? '',
      scanWindowEnd: settings.data.scanWindowEnd ?? '',
    });
  }, [settings.data, reset]);

  async function onSubmit(values: FormValues) {
    setSaved(false);
    setError(null);

    const filledCorners = values.corners.filter((c) => c.lat.trim() !== '' && c.lng.trim() !== '');
    if (filledCorners.length !== 0 && filledCorners.length !== 4) {
      setError('Renseigne les 4 coins du périmètre, ou laisse-les tous vides pour désactiver la restriction.');
      return;
    }
    const geofenceCorners: GeoPoint[] | null =
      filledCorners.length === 4 ? filledCorners.map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) })) : null;

    const hasStart = values.scanWindowStart.trim() !== '';
    const hasEnd = values.scanWindowEnd.trim() !== '';
    if (hasStart !== hasEnd) {
      setError('Renseigne les deux heures (début et fin), ou aucune pour désactiver la restriction.');
      return;
    }

    await updateSettings.mutateAsync({
      geofenceCorners,
      scanWindowStart: hasStart ? values.scanWindowStart : null,
      scanWindowEnd: hasEnd ? values.scanWindowEnd : null,
    });
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Paramètres</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Périmètre de l&apos;école</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Coordonnées GPS des 4 coins du terrain de l&apos;école. Un pointage effectué en dehors de ce périmètre
            n&apos;est pas enregistré. Laisse les 4 coins vides pour désactiver cette restriction.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 items-end">
                <span className="text-xs text-zinc-500 pb-2 w-14">Coin {i + 1}</span>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    {...register(`corners.${i}.lat`)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    {...register(`corners.${i}.lng`)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
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
