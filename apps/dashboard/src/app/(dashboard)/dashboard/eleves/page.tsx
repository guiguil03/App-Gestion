'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CredentialsBanner } from '@/components/ui/credentials-banner';
import { SearchInput } from '@/components/ui/search-input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errors';
import { useClasses } from '@/lib/hooks/useClasses';
import { useCreateStudent, useProvisionParentAccount, useProvisionStudentAccount, useStudents } from '@/lib/hooks/useStudents';

const studentSchema = z.object({
  lastName: z.string().min(1, 'Nom requis'),
  middleName: z.string().optional(),
  firstName: z.string().min(1, 'Prénom requis'),
  sex: z.enum(['M', 'F']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de naissance requise'),
  schoolClassId: z.string().min(1, 'Classe requise'),
  parentFullName: z.string().optional(),
  parentRelationship: z.string().optional(),
  parentPhoneNumber: z.string().optional(),
});
type StudentForm = z.infer<typeof studentSchema>;

type ProvisionedCredentials = { label: string; username: string; password: string | null };

// useSearchParams() force un bailout CSR côté Next.js : la page doit être
// enveloppée dans une frontière Suspense, sinon `next build` échoue.
export default function ElevesPage() {
  return (
    <Suspense fallback={null}>
      <ElevesPageContent />
    </Suspense>
  );
}

function ElevesPageContent() {
  const students = useStudents();
  const classes = useClasses();
  const createStudent = useCreateStudent();
  const provisionStudentAccount = useProvisionStudentAccount();
  const provisionParentAccount = useProvisionParentAccount();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState<ProvisionedCredentials | null>(null);
  const [classFilter, setClassFilter] = useState(searchParams.get('classId') ?? '');
  const [search, setSearch] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: { sex: 'M' },
  });

  const filteredStudents = useMemo(() => {
    const all = students.data ?? [];
    const byClass = classFilter ? all.filter((s) => s.schoolClassId === classFilter) : all;
    const term = search.trim().toLowerCase();
    if (!term) return byClass;
    return byClass.filter((s) =>
      [s.lastName, s.middleName, s.firstName].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  }, [students.data, classFilter, search]);

  async function onSubmit(values: StudentForm) {
    await createStudent.mutateAsync({
      lastName: values.lastName,
      middleName: values.middleName || undefined,
      firstName: values.firstName,
      sex: values.sex,
      dateOfBirth: values.dateOfBirth,
      schoolClassId: values.schoolClassId,
      parent: values.parentFullName
        ? {
            fullName: values.parentFullName,
            relationship: values.parentRelationship || '',
            phoneNumber: values.parentPhoneNumber || '',
          }
        : undefined,
    });
    reset();
  }

  async function handleProvisionStudent(studentId: string, fullName: string) {
    const result = await provisionStudentAccount.mutateAsync(studentId);
    setCredentials({ label: `Compte élève — ${fullName}`, username: result.username, password: result.password });
  }

  async function handleProvisionParent(studentId: string, parentGuardianId: string, fullName: string) {
    const result = await provisionParentAccount.mutateAsync({ studentId, parentGuardianId });
    setCredentials({
      label: result.reused ? `Compte parent existant réutilisé — ${fullName}` : `Compte parent — ${fullName}`,
      username: result.username,
      password: result.password,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Élèves</h1>

      {credentials && (
        <CredentialsBanner
          label={credentials.label}
          username={credentials.username}
          password={credentials.password}
          onDismiss={() => setCredentials(null)}
        />
      )}

      {createStudent.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {getErrorMessage(createStudent.error, "Impossible de créer l'élève. Vérifie les champs et réessaie.")}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Nom</label>
            <input {...register('lastName')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Post-nom</label>
            <input {...register('middleName')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Prénom</label>
            <input {...register('firstName')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Sexe</label>
            <select {...register('sex')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Date de naissance</label>
            <input
              type="date"
              {...register('dateOfBirth')}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            {errors.dateOfBirth && <p className="text-xs text-red-600">{errors.dateOfBirth.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Classe</label>
            <select {...register('schoolClassId')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm">
              <option value="">Sélectionner...</option>
              {(classes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.schoolClassId && <p className="text-xs text-red-600">{errors.schoolClassId.message}</p>}
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">Parent / tuteur (facultatif à la création)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Nom complet</label>
              <input {...register('parentFullName')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Lien de parenté</label>
              <input {...register('parentRelationship')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Téléphone</label>
              <input {...register('parentPhoneNumber')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={createStudent.isPending}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {createStudent.isPending ? 'Création...' : "Créer l'élève"}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">
          {classFilter ? (classes.data ?? []).find((c) => c.id === classFilter)?.name : 'Toutes les classes'} ({filteredStudents.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un élève…" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          >
            <option value="">Toutes les classes</option>
            {(classes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Élève</th>
              <th className="p-3">Classe</th>
              <th className="p-3">Parent(s)</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.isLoading && <TableRowsSkeleton rows={5} cols={4} />}
            {!students.isLoading &&
              filteredStudents.map((student) => {
                const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
                return (
                  <tr key={student.id}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {student.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={student.photoUrl}
                            alt={fullName}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/dashboard/eleves/${student.id}`}
                            className="font-semibold text-zinc-900 hover:text-emerald-600"
                          >
                            {fullName}
                          </Link>
                          <p className="text-xs text-zinc-500">
                            {student.sex === 'M' ? 'Masculin' : 'Féminin'} · {student.dateOfBirth}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-500">{student.schoolClass.name}</td>
                    <td className="p-3">
                      {student.parents.length === 0 && <span className="text-xs text-zinc-400">Aucun parent</span>}
                      <div className="space-y-1.5">
                        {student.parents.map((parent) => (
                          <div key={parent.id} className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                            <span>
                              {parent.fullName} ({parent.relationship}) — {parent.phoneNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleProvisionParent(student.id, parent.id, parent.fullName)}
                              className="text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap"
                            >
                              Provisionner compte parent
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleProvisionStudent(student.id, fullName)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                      >
                        Provisionner compte élève
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!students.isLoading && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-sm text-zinc-400">
                  Aucun élève.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
