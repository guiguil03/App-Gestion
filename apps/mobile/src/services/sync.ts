import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';

import { apiClient } from '@/api/client';
import AttendanceRecord from '@/db/models/AttendanceRecord';

type PullResponse = {
  changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }>;
  timestamp: number;
};

type RawAttendanceRecordChange = {
  id: string;
  student_id: string;
  checkpoint: string;
  direction: string;
  recorded_at: number;
  is_late: boolean;
};

/**
 * Synchronise la base locale WatermelonDB avec le backend : pull des tables
 * de référence (écoles/classes/élèves/cartes révoquées) et push des
 * pointages créés localement (seule table que le rôle Enseignant/Surveillant
 * peut écrire — voir push-changes.dto.ts côté backend). `synchronize()` gère
 * lui-même la persistance de `lastPulledAt`, pas besoin de la stocker nous-mêmes.
 */
export async function runSync(database: Database): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { data } = await apiClient.get<PullResponse>('/sync/pull', {
        params: { lastPulledAt: lastPulledAt ?? 0 },
      });
      return data;
    },
    // NB : ne JAMAIS passer `sendCreatedAsUpdated: true` ici — le backend ne
    // lit que `changes.attendance_records.created` (push-changes.dto.ts) ;
    // cette option enverrait les nouvelles lignes sous `updated`, où elles
    // seraient silencieusement ignorées côté serveur.
    pushChanges: async ({ changes }) => {
      // `changes` est typé par WatermelonDB avec un index signature sur
      // `TableName<any>` (branded string) : cast local pour accéder à la
      // table par son nom littéral.
      const attendanceChanges = (changes as Record<string, { created?: RawAttendanceRecordChange[] }>)
        .attendance_records;
      const created = attendanceChanges?.created ?? [];
      if (created.length === 0) return;

      // Sélection explicite des champs envoyés : `created` contient aussi les
      // colonnes internes WatermelonDB (`_status`, `_changed`) qui n'ont rien
      // à faire sur le fil.
      const picked = created.map(({ id, student_id, checkpoint, direction, recorded_at, is_late }) => ({
        id,
        student_id,
        checkpoint,
        direction,
        recorded_at,
        is_late,
      }));

      await apiClient.post('/sync/push', {
        changes: { attendance_records: { created: picked } },
      });

      // Marque précisément les lignes qui viennent d'être envoyées (par id) —
      // pas toutes les lignes non-synchronisées, pour éviter de marquer à
      // tort un scan concurrent qui serait arrivé pendant ce cycle de sync.
      const syncedAt = new Date();
      const pushedIds = picked.map((row) => row.id);
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('id', Q.oneOf(pushedIds)))
        .fetch();

      await database.batch(
        ...records.map((record) =>
          record.prepareUpdate((r) => {
            r.syncedAt = syncedAt;
          }),
        ),
      );
    },
  });
}
