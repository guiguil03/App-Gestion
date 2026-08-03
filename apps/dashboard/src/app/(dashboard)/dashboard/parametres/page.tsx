'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAttendanceSettings, useUpdateAttendanceSettings } from '@/lib/hooks/useSettings';
import {
  useAddClosureDate,
  useClosureDates,
  useRemoveClosureDate,
  useSchoolProfile,
  useUpdateSchoolProfile,
  useUploadSchoolLogo,
} from '@/lib/hooks/useSchool';

type FormValues = {
  scanWindowStart: string;
  scanWindowEnd: string;
  attendanceReferenceTime: string;
  attendanceToleranceMinutes: string;
  consecutiveAbsenceAlertThreshold: string;
};

const WEEKDAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function ParametresPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Paramètres</h1>
      <SchoolProfileSection />
      <AttendanceSettingsSection />
      <ClosureDatesSection />
    </div>
  );
}

function SchoolProfileSection() {
  const profile = useSchoolProfile();
  const updateProfile = useUpdateSchoolProfile();
  const uploadLogo = useUploadSchoolLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<{ name: string; address: string; directorName: string }>({
    defaultValues: { name: '', address: '', directorName: '' },
  });

  useEffect(() => {
    if (!profile.data) return;
    reset({
      name: profile.data.name,
      address: profile.data.address ?? '',
      directorName: profile.data.directorName ?? '',
    });
  }, [profile.data, reset]);

  async function onSubmit(values: { name: string; address: string; directorName: string }) {
    setSaved(false);
    setError(null);

    if (!values.name.trim()) {
      setError("Le nom de l'école est obligatoire.");
      return;
    }

    await updateProfile.mutateAsync({
      name: values.name.trim(),
      address: values.address.trim() || null,
      directorName: values.directorName.trim() || null,
    });
    setSaved(true);
  }

  async function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError(null);
    try {
      await uploadLogo.mutateAsync(file);
    } catch {
      setLogoError('Échec du téléversement du logo (jpg/png, 5 Mo max).');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Profil de l&apos;école</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Affiché sur les cartes élèves imprimées et les rapports.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
          {profile.data?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.data.logoUrl} alt="Logo de l'école" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] text-zinc-400">Aucun logo</span>
          )}
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLogo.isPending}
            className="rounded-lg border border-zinc-200 text-zinc-700 text-sm font-medium px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50"
          >
            {uploadLogo.isPending ? 'Envoi...' : 'Changer le logo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onLogoSelected} />
          {logoError && <p className="text-xs text-red-600">{logoError}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t border-zinc-100 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Nom de l&apos;école</label>
            <input {...register('name')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Nom du directeur / de la directrice</label>
            <input {...register('directorName')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-500">Adresse</label>
            <input {...register('address')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-emerald-600">Profil enregistré.</p>}

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}

function AttendanceSettingsSection() {
  const settings = useAttendanceSettings();
  const updateSettings = useUpdateAttendanceSettings();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>([]);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      scanWindowStart: '',
      scanWindowEnd: '',
      attendanceReferenceTime: '',
      attendanceToleranceMinutes: '',
      consecutiveAbsenceAlertThreshold: '',
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    reset({
      scanWindowStart: settings.data.scanWindowStart ?? '',
      scanWindowEnd: settings.data.scanWindowEnd ?? '',
      attendanceReferenceTime: settings.data.attendanceReferenceTime,
      attendanceToleranceMinutes: String(settings.data.attendanceToleranceMinutes),
      consecutiveAbsenceAlertThreshold:
        settings.data.consecutiveAbsenceAlertThreshold === null ? '' : String(settings.data.consecutiveAbsenceAlertThreshold),
    });
    setClosedWeekdays(settings.data.closedWeekdays);
  }, [settings.data, reset]);

  function toggleWeekday(day: number) {
    setClosedWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

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

    let alertThreshold: number | null = null;
    if (values.consecutiveAbsenceAlertThreshold.trim() !== '') {
      alertThreshold = Number(values.consecutiveAbsenceAlertThreshold);
      if (!Number.isInteger(alertThreshold) || alertThreshold < 1 || alertThreshold > 60) {
        setError('Le seuil d\'alerte doit être un nombre entier de jours entre 1 et 60, ou vide pour désactiver.');
        return;
      }
    }

    await updateSettings.mutateAsync({
      scanWindowStart: hasStart ? values.scanWindowStart : null,
      scanWindowEnd: hasEnd ? values.scanWindowEnd : null,
      attendanceReferenceTime: values.attendanceReferenceTime,
      attendanceToleranceMinutes: tolerance,
      closedWeekdays,
      consecutiveAbsenceAlertThreshold: alertThreshold,
    });
    setSaved(true);
  }

  return (
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

      <div className="border-t border-zinc-100 pt-4">
        <h2 className="text-sm font-semibold text-zinc-700">Jours de fermeture récurrents</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Ces jours-là, aucune absence n&apos;est détectée. Pour des dates ponctuelles (vacances, jours fériés), voir
          la section ci-dessous.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleWeekday(day)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                closedWeekdays.includes(day)
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <h2 className="text-sm font-semibold text-zinc-700">Alerte absences consécutives</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Nombre de jours d&apos;absence consécutifs (jours d&apos;école uniquement) à partir duquel un élève apparaît
          dans les alertes du dashboard. Laisse vide pour désactiver.
        </p>
        <div className="mt-3 max-w-[10rem]">
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            placeholder="Désactivé"
            {...register('consecutiveAbsenceAlertThreshold')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
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
  );
}

function ClosureDatesSection() {
  const closureDates = useClosureDates();
  const addClosureDate = useAddClosureDate();
  const removeClosureDate = useRemoveClosureDate();
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    setError(null);
    if (!date) {
      setError('Choisis une date.');
      return;
    }
    try {
      await addClosureDate.mutateAsync({ date, label: label.trim() || undefined });
      setDate('');
      setLabel('');
    } catch {
      setError("Échec de l'ajout de la date.");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Dates de fermeture ponctuelles</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Vacances, jours fériés... Aucune absence n&apos;est détectée ces jours-là, en plus des jours de fermeture
          récurrents ci-dessus.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Libellé (optionnel)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : Noël"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void onAdd()}
          disabled={addClosureDate.isPending}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="space-y-1.5">
        {(closureDates.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between text-sm rounded-lg border border-zinc-100 px-3 py-2">
            <span className="text-zinc-700">
              {c.date}
              {c.label ? ` — ${c.label}` : ''}
            </span>
            <button
              type="button"
              onClick={() => void removeClosureDate.mutateAsync(c.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Retirer
            </button>
          </div>
        ))}
        {closureDates.data?.length === 0 && <p className="text-sm text-zinc-400">Aucune date de fermeture.</p>}
      </div>
    </div>
  );
}
