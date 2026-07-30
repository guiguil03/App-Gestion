'use client';

import { useMemo, useState } from 'react';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { useAuditLogs } from '@/lib/hooks/useAudit';
import type { AuditLogEntry } from '@/types/audit';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: isoDate(start), end: isoDate(end) };
}

const ACTION_OPTIONS = [
  { value: '', label: 'Tous les évènements' },
  { value: 'auth.login', label: 'Connexions' },
  { value: 'students.provision', label: 'Provisioning élève/parent' },
  { value: 'staff.disable', label: 'Désactivation de compte personnel' },
  { value: 'cards.revoke', label: 'Révocation de carte' },
  { value: 'classes.', label: 'Gestion des classes' },
  { value: 'admin.school.', label: 'Gestion des écoles' },
] as const;

const ACTION_LABEL: Record<string, string> = {
  'auth.login.success': 'Connexion réussie',
  'auth.login.failure': 'Échec de connexion',
  'students.provision_account': 'Provisioning compte élève',
  'students.provision_parent_account': 'Provisioning compte parent',
  'staff.disable': 'Désactivation compte personnel',
  'cards.revoke': 'Révocation de carte',
  'classes.update': 'Modification de classe',
  'classes.delete': 'Suppression de classe',
  'admin.school.create': "Création d'école",
  'admin.school.update': "Renommage d'école",
  'admin.school.deactivate': "Désactivation d'école",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  DIRECTION: 'Direction',
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
  PARENT: 'Parent',
  ELEVE: 'Élève',
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

function isFailure(action: string): boolean {
  return action.endsWith('.failure') || action.includes('deactivate') || action.includes('disable') || action.includes('delete') || action.includes('revoke');
}

function formatMetadata(entry: AuditLogEntry): string {
  if (!entry.metadata || Object.keys(entry.metadata).length === 0) return '—';
  return Object.entries(entry.metadata)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

export default function JournalPage() {
  const initialRange = useMemo(defaultRange, []);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [action, setAction] = useState('');

  const logs = useAuditLogs({ startDate, endDate, action: action || undefined });
  const rows = logs.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Journal d&apos;activité</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Historique des connexions et actions sensibles (provisioning de comptes, révocation de carte, gestion des
          classes et écoles).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Type d&apos;évènement</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Du</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Au</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Date</th>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Évènement</th>
              <th className="p-3">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.isLoading && <TableRowsSkeleton rows={8} cols={4} />}
            {!logs.isLoading &&
              rows.map((entry) => (
                <tr key={entry.id}>
                  <td className="p-3 text-zinc-500 whitespace-nowrap tabular-nums">
                    {new Date(entry.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-zinc-900">{entry.username ?? '—'}</p>
                    {entry.role && <p className="text-xs text-zinc-500">{ROLE_LABEL[entry.role] ?? entry.role}</p>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        isFailure(entry.action) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {actionLabel(entry.action)}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-500">
                    {entry.targetType && (
                      <span className="mr-1 text-zinc-400">
                        [{entry.targetType}
                        {entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ''}]
                      </span>
                    )}
                    {formatMetadata(entry)}
                  </td>
                </tr>
              ))}
            {!logs.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-sm text-zinc-400">
                  Aucun évènement sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
