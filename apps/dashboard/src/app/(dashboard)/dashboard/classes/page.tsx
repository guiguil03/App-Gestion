'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Pencil, Trash2, Upload, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImportDialog } from '@/components/ui/import-dialog';
import {
  useAssignTeacher,
  useClasses,
  useCreateClass,
  useImportClasses,
  useRemoveClass,
  useUnassignTeacher,
  useUpdateClass,
} from '@/lib/hooks/useClasses';
import { useStaff } from '@/lib/hooks/useStaff';
import type { SchoolClass } from '@/types/classes';

const classSchema = z.object({ name: z.string().min(1, 'Nom requis'), promotion: z.string().min(1, 'Promotion requise') });
type ClassForm = z.infer<typeof classSchema>;

export default function ClassesPage() {
  const classes = useClasses();
  const staff = useStaff();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const removeClass = useRemoveClass();
  const assignTeacher = useAssignTeacher();
  const unassignTeacher = useUnassignTeacher();
  const importClasses = useImportClasses();
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<ClassForm>({ resolver: zodResolver(classSchema) });

  async function onSubmit(values: ClassForm) {
    await createClass.mutateAsync(values);
    reset();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Classes</h1>
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Upload size={14} /> Importer des classes
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Nom</label>
          <input {...register('name')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="6e A" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Promotion</label>
          <input {...register('promotion')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="2026" />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800">
          Créer
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(classes.data ?? []).map((schoolClass) => (
          <ClassRow
            key={schoolClass.id}
            schoolClass={schoolClass}
            staff={staff.data ?? []}
            onRename={(name) => updateClass.mutate({ id: schoolClass.id, input: { name } })}
            onRequestDelete={() => setDeleteTarget(schoolClass)}
            onAssignTeacher={(userId) => assignTeacher.mutate({ classId: schoolClass.id, userId })}
            onUnassignTeacher={(userId) => unassignTeacher.mutate({ classId: schoolClass.id, userId })}
          />
        ))}
        {classes.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucune classe.</p>}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        tone="danger"
        title="Supprimer cette classe ?"
        description={`« ${deleteTarget?.name} » sera retirée de la liste. Les élèves déjà affectés ne sont pas supprimés.`}
        confirmLabel="Supprimer"
        isLoading={removeClass.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeClass.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />

      <ImportDialog
        open={isImportOpen}
        title="Importer des classes"
        description="Fichier CSV ou Excel avec les colonnes « name » (nom) et « promotion ». Une classe déjà existante (même nom + promotion) est ignorée."
        templateHeaders={['name', 'promotion']}
        templateSampleRow={['6e A', '2026']}
        templateFilename="modele-import-classes.xlsx"
        onImport={(rows) => importClasses.mutateAsync(rows)}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}

function ClassRow({
  schoolClass,
  staff,
  onRename,
  onRequestDelete,
  onAssignTeacher,
  onUnassignTeacher,
}: {
  schoolClass: SchoolClass;
  staff: { id: string; username: string }[];
  onRename: (name: string) => void;
  onRequestDelete: () => void;
  onAssignTeacher: (userId: string) => void;
  onUnassignTeacher: (userId: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(schoolClass.name);

  function submitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== schoolClass.name) onRename(trimmed);
    setIsRenaming(false);
  }

  return (
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') {
                  setDraftName(schoolClass.name);
                  setIsRenaming(false);
                }
              }}
              className="rounded-lg border border-emerald-300 px-2 py-1 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="button" onClick={submitRename} className="p-1 text-emerald-600 hover:text-emerald-700">
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftName(schoolClass.name);
                setIsRenaming(false);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-zinc-900">{schoolClass.name}</p>
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              title="Renommer"
              className="p-0.5 text-zinc-300 hover:text-zinc-600"
            >
              <Pencil size={12} />
            </button>
            <Link
              href={`/dashboard/eleves?classId=${schoolClass.id}`}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 ml-1"
            >
              Voir les élèves
            </Link>
          </div>
        )}
        <p className="text-xs text-zinc-500">{schoolClass.promotion}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {schoolClass.assignedTeachers.map((teacher) => (
            <span key={teacher.id} className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5">
              {teacher.username}
              <button type="button" onClick={() => onUnassignTeacher(teacher.id)} className="text-zinc-400 hover:text-red-500">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onAssignTeacher(e.target.value);
            e.target.value = '';
          }}
          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="" disabled>
            + Assigner un enseignant
          </option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.username}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRequestDelete}
          title="Supprimer la classe"
          className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
