import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import * as Sentry from '@sentry/react-native';

import { apiClient } from '@/api/client';
import AttendanceRecord from '@/db/models/AttendanceRecord';
import AttendanceSession from '@/db/models/AttendanceSession';
import { getDecodedAccessToken } from '@/services/secureStorage';
import { getOrCreateDeviceKeyPair } from '@/services/sessionSigning';

type PullResponse = {
  changes: Record<string, { created: unknown[]; updated: unknown[]; deleted: string[] }>;
  timestamp: number;
};

type PushResponse = {
  rejectedAttendanceRecords: { id: string; reason: string }[];
  rejectedAttendanceSessions: { id: string; reason: string }[];
};

type RawAttendanceRecordChange = {
  id: string;
  student_id: string;
  checkpoint: string;
  direction: string;
  recorded_at: number;
  is_late: boolean;
  is_manual: boolean;
  session_id: string | null;
  latitude: number | null;
  longitude: number | null;
};

type RawAttendanceSessionCreateChange = {
  id: string;
  school_class_id: string;
  opened_at: number;
  expires_at: number;
  // Renseigné si la session a été ouverte ET fermée avant le tout premier
  // push (jamais passée par `updated` de son point de vue local).
  closed_at: number | null;
};

type RawAttendanceSessionCloseChange = {
  id: string;
  closed_at: number;
};

/**
 * Enregistre la clé publique de signature de CET appareil auprès du backend,
 * pour que les appareils élèves puissent la synchroniser et vérifier hors
 * ligne les QR de session ouverts par cet enseignant. Best-effort : appelé à
 * chaque sync, silencieusement ignoré hors ligne (retentera au prochain sync).
 */
async function registerSigningKeyIfTeacher(): Promise<void> {
  const token = await getDecodedAccessToken();
  if (!token || (token.role !== 'ENSEIGNANT' && token.role !== 'SURVEILLANT')) return;

  try {
    const { publicKeyHex } = await getOrCreateDeviceKeyPair();
    await apiClient.post('/signing-keys', { publicKey: publicKeyHex });
  } catch {
    // Pas de réseau ou backend injoignable : on réessaiera au prochain sync.
  }
}

/**
 * Synchronise la base locale WatermelonDB avec le backend : pull des tables
 * de référence (écoles/classes/élèves/cartes révoquées) et push des
 * pointages créés localement (seule table que le rôle Enseignant/Surveillant
 * peut écrire — voir push-changes.dto.ts côté backend). `synchronize()` gère
 * lui-même la persistance de `lastPulledAt`, pas besoin de la stocker nous-mêmes.
 */
export async function runSync(database: Database): Promise<void> {
  const startedAt = Date.now();

  try {
    await registerSigningKeyIfTeacher();
    await synchronizeDatabase(database);
    Sentry.metrics.distribution('mobile.sync_duration_ms', Date.now() - startedAt, {
      attributes: { status: 'success' },
    });
  } catch (error) {
    Sentry.metrics.distribution('mobile.sync_duration_ms', Date.now() - startedAt, {
      attributes: { status: 'failed' },
    });
    throw error;
  }
}

async function synchronizeDatabase(database: Database): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const { data } = await apiClient.get<PullResponse>('/sync/pull', {
        params: { lastPulledAt: lastPulledAt ?? 0 },
      });
      return data;
    },
    // NB : ne JAMAIS passer `sendCreatedAsUpdated: true` ici — le backend ne
    // lit que `changes.*.created` (+ `attendance_sessions.updated` pour la
    // fermeture, cf. push-changes.dto.ts) ; cette option enverrait les
    // nouvelles lignes sous `updated`, où elles seraient silencieusement
    // ignorées côté serveur.
    pushChanges: async ({ changes }) => {
      // `changes` est typé par WatermelonDB avec un index signature sur
      // `TableName<any>` (branded string) : cast local pour accéder aux
      // tables par leur nom littéral.
      const rawChanges = changes as Record<
        string,
        { created?: RawAttendanceRecordChange[] | RawAttendanceSessionCreateChange[]; updated?: unknown[] }
      >;

      const createdRecords = (rawChanges.attendance_records?.created ?? []) as RawAttendanceRecordChange[];
      const createdSessions = (rawChanges.attendance_sessions?.created ?? []) as RawAttendanceSessionCreateChange[];
      const updatedSessions = (rawChanges.attendance_sessions?.updated ?? []) as RawAttendanceSessionCloseChange[];

      if (createdRecords.length === 0 && createdSessions.length === 0 && updatedSessions.length === 0) return;

      // Sélection explicite des champs envoyés : `created`/`updated`
      // contiennent aussi les colonnes internes WatermelonDB (`_status`,
      // `_changed`) qui n'ont rien à faire sur le fil.
      const pickedRecords = createdRecords.map(
        ({ id, student_id, checkpoint, direction, recorded_at, is_late, is_manual, session_id, latitude, longitude }) => ({
          id,
          student_id,
          checkpoint,
          direction,
          recorded_at,
          is_late,
          is_manual,
          session_id,
          latitude,
          longitude,
        }),
      );
      const pickedCreatedSessions = createdSessions.map(({ id, school_class_id, opened_at, expires_at, closed_at }) => ({
        id,
        school_class_id,
        opened_at,
        expires_at,
        closed_at,
      }));
      const pickedUpdatedSessions = updatedSessions.map(({ id, closed_at }) => ({ id, closed_at }));

      const { data: pushResult } = await apiClient.post<PushResponse>('/sync/push', {
        changes: {
          attendance_records: { created: pickedRecords },
          attendance_sessions: { created: pickedCreatedSessions, updated: pickedUpdatedSessions },
        },
      });

      // Le backend peut rejeter un pointage en défense en profondeur (hors
      // plage horaire de pointage) sans lever d'erreur HTTP — voir le
      // commentaire de SyncService.push. On ne le marque donc PAS comme
      // synchronisé localement (sinon il disparaît silencieusement sans
      // jamais avoir existé côté serveur), et on le signale à Sentry pour
      // qu'il reste visible : WatermelonDB considère malgré tout ce cycle de
      // push terminé (aucune exception levée ici), donc ce pointage ne sera
      // pas réessayé automatiquement — une correction manuelle depuis le
      // dashboard (fiche élève / pointage rapide par classe) reste possible.
      const rejectedIds = new Set(pushResult.rejectedAttendanceRecords.map((r) => r.id));
      if (rejectedIds.size > 0) {
        Sentry.captureMessage('Pointages rejetés par le serveur (non synchronisés)', {
          level: 'warning',
          extra: { rejected: pushResult.rejectedAttendanceRecords },
        });
      }

      // Même logique que pour les pointages : une session peut être rejetée
      // individuellement (ex. classe réassignée entre-temps) sans faire
      // échouer tout le push — voir le commentaire de SyncService.push.
      const rejectedSessionIds = new Set(pushResult.rejectedAttendanceSessions.map((r) => r.id));
      if (rejectedSessionIds.size > 0) {
        Sentry.captureMessage('Sessions de présence rejetées par le serveur (non synchronisées)', {
          level: 'warning',
          extra: { rejected: pushResult.rejectedAttendanceSessions },
        });
      }

      // Marque précisément les lignes qui viennent d'être envoyées (par id) —
      // pas toutes les lignes non-synchronisées, pour éviter de marquer à
      // tort un scan/session concurrent qui serait arrivé pendant ce cycle.
      // Les lignes rejetées par le serveur sont exclues (voir ci-dessus).
      const syncedAt = new Date();

      const recordIds = pickedRecords.map((row) => row.id).filter((id) => !rejectedIds.has(id));
      const records = recordIds.length
        ? await database.get<AttendanceRecord>('attendance_records').query(Q.where('id', Q.oneOf(recordIds))).fetch()
        : [];

      const sessionIds = [...pickedCreatedSessions.map((row) => row.id), ...pickedUpdatedSessions.map((row) => row.id)].filter(
        (id) => !rejectedSessionIds.has(id),
      );
      const sessions = sessionIds.length
        ? await database
            .get<AttendanceSession>('attendance_sessions')
            .query(Q.where('id', Q.oneOf(sessionIds)))
            .fetch()
        : [];

      await database.batch(
        ...records.map((record) => record.prepareUpdate((r) => { r.syncedAt = syncedAt; })),
        ...sessions.map((session) => session.prepareUpdate((s) => { s.syncedAt = syncedAt; })),
      );
    },
  });
}
