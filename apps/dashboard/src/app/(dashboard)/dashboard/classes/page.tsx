'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAssignTeacher, useClasses, useCreateClass, useUnassignTeacher } from '@/lib/hooks/useClasses';
import { useStaff } from '@/lib/hooks/useStaff';

const classSchema = z.object({ name: z.string().min(1, 'Nom requis'), promotion: z.string().min(1, 'Promotion requise') });
type ClassForm = z.infer<typeof classSchema>;

export default function ClassesPage() {
  const classes = useClasses();
  const staff = useStaff();
  const createClass = useCreateClass();
  const assignTeacher = useAssignTeacher();
  const unassignTeacher = useUnassignTeacher();
  const { register, handleSubmit, reset } = useForm<ClassForm>({ resolver: zodResolver(classSchema) });

  async function onSubmit(values: ClassForm) {
    await createClass.mutateAsync(values);
    reset();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Classes</h1>

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
          <div key={schoolClass.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{schoolClass.name}</p>
              <p className="text-xs text-zinc-500">{schoolClass.promotion}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {schoolClass.assignedTeachers.map((teacher) => (
                  <span key={teacher.id} className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5">
                    {teacher.username}
                    <button
                      type="button"
                      onClick={() => unassignTeacher.mutate({ classId: schoolClass.id, userId: teacher.id })}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) assignTeacher.mutate({ classId: schoolClass.id, userId: e.target.value });
                e.target.value = '';
              }}
              className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
            >
              <option value="" disabled>
                + Assigner un enseignant
              </option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.username}
                </option>
              ))}
            </select>
          </div>
        ))}
        {classes.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucune classe.</p>}
      </div>
    </div>
  );
}
