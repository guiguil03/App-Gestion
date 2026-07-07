# NavBar bottom-tabs + refonte visuelle mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une barre d'onglets en bas d'écran par rôle (enseignant : Dashboard/Classe/Scan/Historique/Profil ; parent : Enfants/Historique/Profil), avec les nouveaux écrans qui vont avec, et repolir visuellement les écrans existants avec `@expo/vector-icons`.

**Architecture:** `expo-router` `<Tabs>` imbriqués sous `(teacher)/_layout.tsx` et `(parent)/_layout.tsx` (le `Stack` racine ne change pas). Les nouveaux écrans dérivent uniquement des données déjà synchronisées localement (WatermelonDB : `students`, `attendance_records`, `schools`, `assigned_classes`) via de nouveaux hooks calqués sur `useClassAttendanceSummary`/`useAssignedClasses`.

**Tech Stack:** React Native 0.86 / Expo SDK 57 / expo-router / WatermelonDB / `@expo/vector-icons` (Ionicons).

**Spec:** `docs/superpowers/specs/2026-07-07-mobile-navbar-redesign-design.md`

**No test framework:** `apps/mobile` n'a aucune configuration Jest/RNTL. Chaque tâche se termine par une vérification manuelle (dev client) au lieu d'un test automatisé — cf. section "Tests" de la spec.

---

### Task 1: Ajouter `@expo/vector-icons`

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Installer la dépendance**

Run: `cd apps/mobile && npx expo install @expo/vector-icons`

Expected: `package.json` gagne une ligne `"@expo/vector-icons": "..."` dans `dependencies`, `npm install` se termine sans erreur.

- [ ] **Step 2: Vérifier la compatibilité Expo**

Run: `cd apps/mobile && npx expo install --check`

Expected: `@expo/vector-icons` n'apparaît plus dans la liste des paquets à mettre à jour (les autres warnings préexistants — `netinfo`, `expo-camera`, etc. — sont hors scope de cette tâche, on ne les touche pas).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "chore(mobile): add @expo/vector-icons"
```

---

### Task 2: Util de regroupement par jour

**Files:**
- Create: `apps/mobile/src/features/attendance/dateKey.ts`

- [ ] **Step 1: Créer le fichier**

```ts
// apps/mobile/src/features/attendance/dateKey.ts

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Clé de jour calendaire en heure locale (évite les décalages UTC de `toISOString`). */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Ex. "Lundi 6 juillet". */
export function dateLabel(date: Date): string {
  const label = DAY_LABEL_FORMATTER.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
```

- [ ] **Step 2: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type liée à ce fichier.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/attendance/dateKey.ts
git commit -m "feat(mobile): add day-grouping date helpers"
```

---

### Task 3: Décodage du JWT + hook de déconnexion

**Files:**
- Modify: `apps/mobile/src/services/secureStorage.ts`
- Create: `apps/mobile/src/api/hooks/useLogout.ts`

- [ ] **Step 1: Ajouter le décodage du payload JWT dans `secureStorage.ts`**

Fichier actuel (`apps/mobile/src/services/secureStorage.ts`) :

```ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

Remplacer par (ajout en fin de fichier, reste inchangé) :

```ts
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export type AccessTokenPayload = {
  userId: string;
  username: string;
  role: 'ADMIN' | 'DIRECTION' | 'ENSEIGNANT' | 'SURVEILLANT' | 'PARENT';
  schoolId: string | null;
};

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

// Décodage local du payload, sans vérification de signature : usage
// display-only (Profil), jamais pour une décision d'autorisation (le backend
// reste seul juge de la validité du token sur chaque appel API).
export async function getDecodedAccessToken(): Promise<AccessTokenPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return null;

  const payload = JSON.parse(base64UrlDecode(payloadSegment));
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    schoolId: payload.schoolId ?? null,
  };
}
```

- [ ] **Step 2: Créer le hook de déconnexion**

```ts
// apps/mobile/src/api/hooks/useLogout.ts
import { router } from 'expo-router';

import { queryClient } from '@/api/client';
import { clearAuthTokens } from '@/services/secureStorage';

/** Déconnexion : purge tokens + cache react-query, retour au login. */
export function useLogout(): () => Promise<void> {
  return async function logout() {
    await clearAuthTokens();
    queryClient.clear();
    router.replace('/(auth)/login');
  };
}
```

- [ ] **Step 3: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/secureStorage.ts apps/mobile/src/api/hooks/useLogout.ts
git commit -m "feat(mobile): add JWT payload decoding and logout hook"
```

---

### Task 4: Hook `useClassRoster`

**Files:**
- Create: `apps/mobile/src/features/classes/hooks/useClassRoster.ts`

- [ ] **Step 1: Créer le hook**

```ts
// apps/mobile/src/features/classes/hooks/useClassRoster.ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

export type RosterStatus = 'present' | 'late' | 'absent';

export type RosterEntry = {
  studentId: string;
  studentName: string;
  status: RosterStatus;
};

/** Élèves d'une classe avec leur statut de présence du jour. */
export function useClassRoster(classId: string | null): RosterEntry[] {
  const database = useOptionalDatabase();
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  useEffect(() => {
    if (!database || !classId) {
      setRoster([]);
      return;
    }

    let latestStudents: Student[] = [];
    let latestRecords: AttendanceRecord[] = [];
    let isCancelled = false;
    let recordsSubscription: { unsubscribe: () => void } | null = null;

    function recompute() {
      if (isCancelled) return;

      const lateStudentIds = new Set(
        latestRecords.filter((record) => record.isLate).map((record) => record.studentId),
      );
      const presentStudentIds = new Set(latestRecords.map((record) => record.studentId));

      const entries = [...latestStudents]
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((student) => ({
          studentId: student.id,
          studentName: student.fullName,
          status: (lateStudentIds.has(student.id)
            ? 'late'
            : presentStudentIds.has(student.id)
              ? 'present'
              : 'absent') as RosterStatus,
        }));

      setRoster(entries);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const studentsSubscription = database
      .get<Student>('students')
      .query(Q.where('school_class_id', classId))
      .observe()
      .subscribe((students) => {
        latestStudents = students;
        const studentIds = students.map((student) => student.id);

        recordsSubscription?.unsubscribe();
        recordsSubscription = null;

        if (studentIds.length === 0) {
          latestRecords = [];
          recompute();
          return;
        }

        recordsSubscription = database
          .get<AttendanceRecord>('attendance_records')
          .query(Q.where('student_id', Q.oneOf(studentIds)), Q.where('recorded_at', Q.gte(startOfDay.getTime())))
          .observe()
          .subscribe((records) => {
            latestRecords = records;
            recompute();
          });
      });

    return () => {
      isCancelled = true;
      studentsSubscription.unsubscribe();
      recordsSubscription?.unsubscribe();
    };
  }, [database, classId]);

  return roster;
}
```

- [ ] **Step 2: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/classes/hooks/useClassRoster.ts
git commit -m "feat(mobile): add useClassRoster hook"
```

---

### Task 5: Hook `useClassHistory`

**Files:**
- Create: `apps/mobile/src/features/attendance/hooks/useClassHistory.ts`

- [ ] **Step 1: Créer le hook**

```ts
// apps/mobile/src/features/attendance/hooks/useClassHistory.ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { dateKey, dateLabel } from '@/features/attendance/dateKey';

const HISTORY_WINDOW_DAYS = 30;

export type DayRecord = {
  id: string;
  studentName: string;
  recordedAt: Date;
  checkpoint: Checkpoint;
  isLate: boolean;
};

export type DaySummary = {
  dateKey: string;
  dateLabel: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  records: DayRecord[];
};

/** Historique jour par jour (30 derniers jours, hors aujourd'hui) pour une classe. */
export function useClassHistory(classId: string | null): DaySummary[] {
  const database = useOptionalDatabase();
  const [days, setDays] = useState<DaySummary[]>([]);

  useEffect(() => {
    if (!database || !classId) {
      setDays([]);
      return;
    }

    let latestStudents: Student[] = [];
    let latestRecords: AttendanceRecord[] = [];
    let isCancelled = false;
    let recordsSubscription: { unsubscribe: () => void } | null = null;

    function recompute() {
      if (isCancelled) return;
      if (latestStudents.length === 0) {
        setDays([]);
        return;
      }

      const studentNameById = new Map(latestStudents.map((student) => [student.id, student.fullName]));
      const totalStudents = latestStudents.length;
      const todayKey = dateKey(new Date());
      const byDay = new Map<string, AttendanceRecord[]>();

      for (const record of latestRecords) {
        const key = dateKey(record.recordedAt);
        const bucket = byDay.get(key) ?? [];
        bucket.push(record);
        byDay.set(key, bucket);
      }

      const summaries = [...byDay.entries()]
        .filter(([key]) => key !== todayKey)
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .map(([key, records]) => {
          const presentStudentIds = new Set(records.map((record) => record.studentId));
          const lateStudentIds = new Set(
            records.filter((record) => record.isLate).map((record) => record.studentId),
          );

          return {
            dateKey: key,
            dateLabel: dateLabel(records[0].recordedAt),
            presentCount: presentStudentIds.size,
            lateCount: lateStudentIds.size,
            absentCount: totalStudents - presentStudentIds.size,
            records: [...records]
              .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
              .map((record) => ({
                id: record.id,
                studentName: studentNameById.get(record.studentId) ?? 'Élève inconnu',
                recordedAt: record.recordedAt,
                checkpoint: record.checkpoint,
                isLate: record.isLate,
              })),
          };
        });

      setDays(summaries);
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    windowStart.setHours(0, 0, 0, 0);

    const studentsSubscription = database
      .get<Student>('students')
      .query(Q.where('school_class_id', classId))
      .observe()
      .subscribe((students) => {
        latestStudents = students;
        const studentIds = students.map((student) => student.id);

        recordsSubscription?.unsubscribe();
        recordsSubscription = null;

        if (studentIds.length === 0) {
          latestRecords = [];
          recompute();
          return;
        }

        recordsSubscription = database
          .get<AttendanceRecord>('attendance_records')
          .query(Q.where('student_id', Q.oneOf(studentIds)), Q.where('recorded_at', Q.gte(windowStart.getTime())))
          .observe()
          .subscribe((records) => {
            latestRecords = records;
            recompute();
          });
      });

    return () => {
      isCancelled = true;
      studentsSubscription.unsubscribe();
      recordsSubscription?.unsubscribe();
    };
  }, [database, classId]);

  return days;
}
```

- [ ] **Step 2: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/attendance/hooks/useClassHistory.ts
git commit -m "feat(mobile): add useClassHistory hook"
```

---

### Task 6: Extraire `useChildren` + hook `useChildHistory`

**Files:**
- Create: `apps/mobile/src/features/children/hooks/useChildren.ts`
- Create: `apps/mobile/src/features/attendance/hooks/useChildHistory.ts`
- Modify: `apps/mobile/src/app/(parent)/children.tsx:1-27` (retrait de la définition locale de `useChildren`, fait en Task 9)

- [ ] **Step 1: Extraire `useChildren` dans son propre fichier**

```ts
// apps/mobile/src/features/children/hooks/useChildren.ts
import { useEffect, useState } from 'react';

import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

// Le backend ne synchronise vers un compte parent que les fiches de ses
// propres enfants (voir SyncModule) : toute la table locale `students`
// représente donc déjà la liste "mes enfants".
export function useChildren(): Student[] {
  const database = useOptionalDatabase();
  const [children, setChildren] = useState<Student[]>([]);

  useEffect(() => {
    if (!database) return;
    const subscription = database
      .get<Student>('students')
      .query()
      .observe()
      .subscribe(setChildren);
    return () => subscription.unsubscribe();
  }, [database]);

  return children;
}
```

- [ ] **Step 2: Créer `useChildHistory`**

```ts
// apps/mobile/src/features/attendance/hooks/useChildHistory.ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { dateKey, dateLabel } from '@/features/attendance/dateKey';

const HISTORY_WINDOW_DAYS = 30;

export type ChildDayRecord = {
  id: string;
  recordedAt: Date;
  checkpoint: Checkpoint;
  isLate: boolean;
};

export type ChildDaySummary = {
  dateKey: string;
  dateLabel: string;
  status: 'present' | 'late';
  records: ChildDayRecord[];
};

/**
 * Historique jour par jour (30 derniers jours, hors aujourd'hui) pour un
 * enfant. Ne montre que les jours avec au moins un pointage — pas
 * d'inférence d'absence côté parent (nécessiterait un calendrier scolaire,
 * hors scope, cf. spec).
 */
export function useChildHistory(studentId: string | null): ChildDaySummary[] {
  const database = useOptionalDatabase();
  const [days, setDays] = useState<ChildDaySummary[]>([]);

  useEffect(() => {
    if (!database || !studentId) {
      setDays([]);
      return;
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    windowStart.setHours(0, 0, 0, 0);
    const todayKey = dateKey(new Date());

    const subscription = database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('student_id', studentId), Q.where('recorded_at', Q.gte(windowStart.getTime())))
      .observe()
      .subscribe((records) => {
        const byDay = new Map<string, AttendanceRecord[]>();
        for (const record of records) {
          const key = dateKey(record.recordedAt);
          const bucket = byDay.get(key) ?? [];
          bucket.push(record);
          byDay.set(key, bucket);
        }

        const summaries = [...byDay.entries()]
          .filter(([key]) => key !== todayKey)
          .sort(([a], [b]) => (a < b ? 1 : -1))
          .map(([key, dayRecords]) => ({
            dateKey: key,
            dateLabel: dateLabel(dayRecords[0].recordedAt),
            status: (dayRecords.some((record) => record.isLate) ? 'late' : 'present') as 'present' | 'late',
            records: [...dayRecords]
              .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
              .map((record) => ({
                id: record.id,
                recordedAt: record.recordedAt,
                checkpoint: record.checkpoint,
                isLate: record.isLate,
              })),
          }));

        setDays(summaries);
      });

    return () => subscription.unsubscribe();
  }, [database, studentId]);

  return days;
}
```

- [ ] **Step 3: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type (la migration de `children.tsx` vers ce hook se fait en Task 9 ; ne pas modifier `children.tsx` ici pour garder ce commit isolé).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/children/hooks/useChildren.ts apps/mobile/src/features/attendance/hooks/useChildHistory.ts
git commit -m "feat(mobile): extract useChildren hook, add useChildHistory hook"
```

---

### Task 7: Écran Classe (enseignant)

**Files:**
- Create: `apps/mobile/src/app/(teacher)/classe.tsx`

- [ ] **Step 1: Créer l'écran**

```tsx
// apps/mobile/src/app/(teacher)/classe.tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';
import { useClassRoster, type RosterStatus } from '@/features/classes/hooks/useClassRoster';

const SUCCESS_COLOR = '#16A34A';
const WARNING_COLOR = '#F59E0B';
const DANGER_COLOR = '#DC2626';
const BRAND_COLOR = '#208AEF';

const STATUS_CONFIG: Record<RosterStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  present: { label: 'Présent', color: SUCCESS_COLOR, icon: 'checkmark-circle' },
  late: { label: 'Retard', color: WARNING_COLOR, icon: 'time' },
  absent: { label: 'Absent', color: DANGER_COLOR, icon: 'close-circle' },
};

export default function ClasseScreen() {
  const database = useOptionalDatabase();
  const { classes, isLoading: classesLoading } = useAssignedClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      if (selectedClassId !== null) setSelectedClassId(null);
      return;
    }
    const stillAssigned = classes.some((schoolClass) => schoolClass.id === selectedClassId);
    if (!stillAssigned) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const roster = useClassRoster(selectedClassId);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app
          via un dev client (npx expo run:android ou EAS Build) pour tester cet écran.
        </ThemedText>
      </ThemedView>
    );
  }

  if (classesLoading) {
    return <ThemedView style={styles.container} />;
  }

  if (classes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Aucune classe assignée — contacte l'administration.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Classe
      </ThemedText>

      {classes.length > 1 && (
        <ThemedView type="backgroundElement" style={styles.classSwitch}>
          {classes.map((schoolClass) => (
            <Pressable
              key={schoolClass.id}
              style={[styles.classOption, selectedClassId === schoolClass.id && styles.classOptionActive]}
              onPress={() => setSelectedClassId(schoolClass.id)}
            >
              <ThemedText
                type="smallBold"
                style={selectedClassId === schoolClass.id ? styles.classOptionLabelActive : undefined}
              >
                {schoolClass.name}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <FlatList
        data={roster}
        keyExtractor={(entry) => entry.studentId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedView style={[styles.avatar, { backgroundColor: STATUS_CONFIG[item.status].color }]}>
              <ThemedText style={styles.avatarLabel}>{item.studentName.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>
            <ThemedText type="smallBold" style={styles.rowName}>
              {item.studentName}
            </ThemedText>
            <Ionicons name={STATUS_CONFIG[item.status].icon} size={16} color={STATUS_CONFIG[item.status].color} />
            <ThemedText type="small" style={{ color: STATUS_CONFIG[item.status].color }}>
              {STATUS_CONFIG[item.status].label}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedView style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun élève dans cette classe.</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  classSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  classOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  classOptionActive: {
    backgroundColor: BRAND_COLOR,
  },
  classOptionLabelActive: {
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  rowName: {
    flex: 1,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type. (L'écran ne sera visible dans l'app qu'après Task 11 — pas encore de tab pour y accéder ; c'est attendu.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/app/\(teacher\)/classe.tsx
git commit -m "feat(mobile): add teacher Classe screen"
```

---

### Task 8: Écran Historique (enseignant)

**Files:**
- Create: `apps/mobile/src/app/(teacher)/historique.tsx`

- [ ] **Step 1: Créer l'écran**

```tsx
// apps/mobile/src/app/(teacher)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';
import { useClassHistory } from '@/features/attendance/hooks/useClassHistory';

const BRAND_COLOR = '#208AEF';
const WARNING_COLOR = '#F59E0B';
const DANGER_COLOR = '#DC2626';

export default function HistoriqueScreen() {
  const database = useOptionalDatabase();
  const { classes, isLoading: classesLoading } = useAssignedClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      if (selectedClassId !== null) setSelectedClassId(null);
      return;
    }
    const stillAssigned = classes.some((schoolClass) => schoolClass.id === selectedClassId);
    if (!stillAssigned) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const days = useClassHistory(selectedClassId);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
        </ThemedText>
      </ThemedView>
    );
  }

  if (classesLoading) {
    return <ThemedView style={styles.container} />;
  }

  if (classes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Aucune classe assignée — contacte l'administration.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Historique
      </ThemedText>

      {classes.length > 1 && (
        <ThemedView type="backgroundElement" style={styles.classSwitch}>
          {classes.map((schoolClass) => (
            <Pressable
              key={schoolClass.id}
              style={[styles.classOption, selectedClassId === schoolClass.id && styles.classOptionActive]}
              onPress={() => setSelectedClassId(schoolClass.id)}
            >
              <ThemedText
                type="smallBold"
                style={selectedClassId === schoolClass.id ? styles.classOptionLabelActive : undefined}
              >
                {schoolClass.name}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <FlatList
        data={days}
        keyExtractor={(day) => day.dateKey}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = expandedDayKey === item.dateKey;
          return (
            <ThemedView type="backgroundElement" style={styles.dayCard}>
              <Pressable style={styles.dayHeader} onPress={() => setExpandedDayKey(isExpanded ? null : item.dateKey)}>
                <ThemedView style={styles.dayHeaderText}>
                  <ThemedText type="smallBold" style={styles.dayLabel}>
                    {item.dateLabel}
                  </ThemedText>
                  <ThemedView style={styles.dayMetaRow}>
                    <ThemedText type="small" style={{ color: DANGER_COLOR }}>
                      {item.absentCount} absent{item.absentCount > 1 ? 's' : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {' · '}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: WARNING_COLOR }}>
                      {item.lateCount} retard{item.lateCount > 1 ? 's' : ''}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={BRAND_COLOR} />
              </Pressable>

              {isExpanded &&
                item.records.map((record) => (
                  <ThemedView key={record.id} style={styles.recordRow}>
                    <ThemedText type="small">{record.studentName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {record.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} ·{' '}
                      {record.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {record.isLate ? ' · Retard' : ''}
                    </ThemedText>
                  </ThemedView>
                ))}
            </ThemedView>
          );
        }}
        ListEmptyComponent={
          <ThemedView style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun historique pour cette classe.</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  classSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  classOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  classOptionActive: {
    backgroundColor: BRAND_COLOR,
  },
  classOptionLabelActive: {
    color: '#ffffff',
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  dayCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayHeaderText: {
    flex: 1,
    gap: 4,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
  recordRow: {
    paddingLeft: 8,
    paddingVertical: 4,
    gap: 2,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/app/\(teacher\)/historique.tsx
git commit -m "feat(mobile): add teacher Historique screen"
```

---

### Task 9: Écran Historique (parent) + restyle Enfants

**Files:**
- Create: `apps/mobile/src/app/(parent)/historique.tsx`
- Modify: `apps/mobile/src/app/(parent)/children.tsx` (réécriture complète)

- [ ] **Step 1: Créer l'écran Historique parent**

```tsx
// apps/mobile/src/app/(parent)/historique.tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useChildren } from '@/features/children/hooks/useChildren';
import { useChildHistory } from '@/features/attendance/hooks/useChildHistory';

const BRAND_COLOR = '#208AEF';
const SUCCESS_COLOR = '#16A34A';
const WARNING_COLOR = '#F59E0B';

export default function ParentHistoriqueScreen() {
  const database = useOptionalDatabase();
  const children = useChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    if (children.length === 0) {
      if (selectedChildId !== null) setSelectedChildId(null);
      return;
    }
    const stillPresent = children.some((child) => child.id === selectedChildId);
    if (!stillPresent) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const days = useChildHistory(selectedChildId);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go.
        </ThemedText>
      </ThemedView>
    );
  }

  if (children.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Aucun enfant synchronisé pour le moment.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Historique
      </ThemedText>

      {children.length > 1 && (
        <ThemedView type="backgroundElement" style={styles.childSwitch}>
          {children.map((child) => (
            <Pressable
              key={child.id}
              style={[styles.childOption, selectedChildId === child.id && styles.childOptionActive]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <ThemedText
                type="smallBold"
                style={selectedChildId === child.id ? styles.childOptionLabelActive : undefined}
              >
                {child.fullName}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <FlatList
        data={days}
        keyExtractor={(day) => day.dateKey}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.dayCard}>
            <ThemedText type="smallBold" style={styles.dayLabel}>
              {item.dateLabel}
            </ThemedText>
            <ThemedText type="small" style={{ color: item.status === 'late' ? WARNING_COLOR : SUCCESS_COLOR }}>
              {item.status === 'late' ? 'Arrivée en retard' : 'Présent'}
            </ThemedText>
            {item.records.map((record) => (
              <ThemedText key={record.id} type="small" themeColor="textSecondary">
                {record.checkpoint === 'portail' ? 'Portail' : 'Salle de classe'} ·{' '}
                {record.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
            ))}
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedView style={styles.emptyList}>
            <ThemedText themeColor="textSecondary">Aucun historique pour cet enfant.</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  childSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  childOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  childOptionActive: {
    backgroundColor: BRAND_COLOR,
  },
  childOptionLabelActive: {
    color: '#ffffff',
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  dayCard: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  dayLabel: {
    textTransform: 'capitalize',
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Réécrire `children.tsx`** (utilise le hook extrait en Task 6, style aligné sur le Dashboard/Classe enseignant, titre en 24px comme les autres écrans au lieu du 48px par défaut)

```tsx
// apps/mobile/src/app/(parent)/children.tsx
import { FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useChildren } from '@/features/children/hooks/useChildren';

const BRAND_COLOR = '#208AEF';

export default function ChildrenScreen() {
  const database = useOptionalDatabase();
  const children = useChildren();

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Cet écran nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance l'app
          via un dev client (npx expo run:android ou EAS Build) pour tester cet écran.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Mes enfants
      </ThemedText>
      <FlatList
        data={children}
        keyExtractor={(student) => student.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedView style={styles.avatar}>
              <ThemedText style={styles.avatarLabel}>{item.fullName.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>
            <ThemedText type="smallBold">{item.fullName}</ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Aucun enfant synchronisé pour le moment.</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLOR,
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  message: {
    textAlign: 'center',
  },
});
```

- [ ] **Step 3: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/src/app/(parent)/historique.tsx" "apps/mobile/src/app/(parent)/children.tsx"
git commit -m "feat(mobile): add parent Historique screen, restyle Enfants screen"
```

---

### Task 10: Écran Profil (partagé)

**Files:**
- Create: `apps/mobile/src/features/profile/ProfileScreen.tsx`
- Create: `apps/mobile/src/app/(teacher)/profil.tsx`
- Create: `apps/mobile/src/app/(parent)/profil.tsx`

- [ ] **Step 1: Créer le composant partagé**

```tsx
// apps/mobile/src/features/profile/ProfileScreen.tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLogout } from '@/api/hooks/useLogout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import School from '@/db/models/School';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { getDecodedAccessToken } from '@/services/secureStorage';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
  PARENT: 'Parent',
};

export function ProfileScreen() {
  const database = useOptionalDatabase();
  const logout = useLogout();
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    getDecodedAccessToken().then(async (payload) => {
      if (isCancelled || !payload) return;
      setUsername(payload.username);
      setRole(payload.role);

      if (!database || !payload.schoolId) return;
      const school = await database
        .get<School>('schools')
        .find(payload.schoolId)
        .catch(() => null);
      if (!isCancelled && school) setSchoolName(school.name);
    });

    return () => {
      isCancelled = true;
    };
  }, [database]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Profil
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ProfileRow label="Identifiant" value={username ?? '—'} />
        <ProfileRow label="Rôle" value={role ? (ROLE_LABELS[role] ?? role) : '—'} />
        <ProfileRow label="École" value={schoolName ?? '—'} />
      </ThemedView>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#ffffff" />
        <ThemedText style={styles.logoutLabel}>Déconnexion</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  title: {
    fontSize: 24,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Monter le composant dans les deux groupes de rôles**

```tsx
// apps/mobile/src/app/(teacher)/profil.tsx
export { ProfileScreen as default } from '@/features/profile/ProfileScreen';
```

```tsx
// apps/mobile/src/app/(parent)/profil.tsx
export { ProfileScreen as default } from '@/features/profile/ProfileScreen';
```

- [ ] **Step 3: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/profile/ProfileScreen.tsx "apps/mobile/src/app/(teacher)/profil.tsx" "apps/mobile/src/app/(parent)/profil.tsx"
git commit -m "feat(mobile): add shared Profil screen for both roles"
```

---

### Task 11: Layouts à onglets

**Files:**
- Create: `apps/mobile/src/app/(teacher)/_layout.tsx`
- Create: `apps/mobile/src/app/(parent)/_layout.tsx`

- [ ] **Step 1: Layout enseignant**

```tsx
// apps/mobile/src/app/(teacher)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

const BRAND_COLOR = '#208AEF';

export default function TeacherTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_COLOR,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classe"
        options={{
          title: 'Classe',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'camera' : 'camera-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Layout parent**

```tsx
// apps/mobile/src/app/(parent)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

const BRAND_COLOR = '#208AEF';

export default function ParentTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_COLOR,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen
        name="children"
        options={{
          title: 'Enfants',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type. À ce stade, relancer `npx expo start -c`, recharger l'app, se connecter avec `surveillant1`/`changeme123` : la barre à 5 onglets doit apparaître (Dashboard/Classe/Scan/Historique/Profil), chaque onglet doit être navigable. Se déconnecter (`direction1`/`changeme123` a le même dashboard), se reconnecter avec un compte parent une fois qu'il existe (hors scope : le seed actuel n'a pas de compte PARENT, vérifier juste que la structure de tabs `(parent)` compile).

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/src/app/(teacher)/_layout.tsx" "apps/mobile/src/app/(parent)/_layout.tsx"
git commit -m "feat(mobile): add bottom tab navigation for teacher and parent roles"
```

---

### Task 12: Repolissage icônes — Login, Dashboard, Scan

**Files:**
- Modify: `apps/mobile/src/app/(auth)/login.tsx`
- Modify: `apps/mobile/src/app/(teacher)/dashboard.tsx`
- Modify: `apps/mobile/src/app/(teacher)/scan.tsx`

- [ ] **Step 1: `login.tsx` — imports**

Old:
```tsx
import { router } from 'expo-router';

import { getLoginErrorMessage, useLogin } from '@/api/hooks/useLogin';
import { ThemedText } from '@/components/themed-text';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { initialRouteForRole } from '@/navigation/roleGuard';
```

New:
```tsx
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getLoginErrorMessage, useLogin } from '@/api/hooks/useLogin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { initialRouteForRole } from '@/navigation/roleGuard';
```

- [ ] **Step 2: `login.tsx` — thème dans le composant**

Old:
```tsx
export default function LoginScreen() {
  const [username, setUsername] = useState('');
```

New:
```tsx
export default function LoginScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState('');
```

- [ ] **Step 3: `login.tsx` — logo emoji → icône**

Old:
```tsx
        <View style={styles.logoBadge}>
          <ThemedText style={styles.logoEmoji}>🏫</ThemedText>
        </View>
```

New:
```tsx
        <View style={styles.logoBadge}>
          <Ionicons name="school" size={36} color="#ffffff" />
        </View>
```

- [ ] **Step 4: `login.tsx` — labels des champs (couleur via `themeColor` au lieu d'un style en dur)**

Old (2 occurrences — Identifiant et Mot de passe) :
```tsx
          <ThemedText type="small" style={styles.label}>
            Identifiant
          </ThemedText>
```
```tsx
          <ThemedText type="small" style={styles.label}>
            Mot de passe
          </ThemedText>
```

New :
```tsx
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Identifiant
          </ThemedText>
```
```tsx
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Mot de passe
          </ThemedText>
```

- [ ] **Step 5: `login.tsx` — carte + titre (support dark mode)**

Old:
```tsx
      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Connexion</ThemedText>
```

New:
```tsx
      <ThemedView type="background" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.cardTitle}>
          Connexion
        </ThemedText>
```

- [ ] **Step 6: `login.tsx` — inputs (couleurs thème au lieu de couleurs en dur)**

Old:
```tsx
          <TextInput
            style={[styles.input, usernameFocused && styles.inputFocused]}
            placeholder="ex. surveillant1"
            placeholderTextColor="#9AA0A8"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
          />
```

New:
```tsx
          <TextInput
            style={[
              styles.input,
              {
                borderColor: usernameFocused ? BRAND_COLOR : theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            ]}
            placeholder="ex. surveillant1"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
          />
```

Old:
```tsx
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="••••••••"
            placeholderTextColor="#9AA0A8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
```

New:
```tsx
          <TextInput
            style={[
              styles.input,
              {
                borderColor: passwordFocused ? BRAND_COLOR : theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            ]}
            placeholder="••••••••"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
```

- [ ] **Step 7: `login.tsx` — fermeture de la carte**

Old:
```tsx
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
```

New:
```tsx
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 8: `login.tsx` — nettoyage des styles devenus inutiles**

Old:
```tsx
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
```

New:
```tsx
  card: {
    borderTopLeftRadius: 28,
```

Old:
```tsx
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#9AA0A8',
    marginBottom: 4,
  },
```

New:
```tsx
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
```

Old:
```tsx
  label: {
    marginLeft: 2,
    color: '#6B7280',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111318',
  },
  inputFocused: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#ffffff',
  },
```

New:
```tsx
  label: {
    marginLeft: 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
```

Old:
```tsx
  logoEmoji: {
    fontSize: 36,
  },
```

New: (supprimer ce bloc entièrement — plus utilisé)

- [ ] **Step 9: `dashboard.tsx` — imports + retrait de `router` (plus utilisé)**

Old:
```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
```

New:
```tsx
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
```

- [ ] **Step 10: `dashboard.tsx` — icônes des stats**

Old:
```tsx
        <SummaryStat label="Présents" value={summary.presentCount} color={SUCCESS_COLOR} icon="✓" />
        <SummaryStat label="En retard" value={summary.lateCount} color={WARNING_COLOR} icon="⏱" />
        <SummaryStat label="Absents" value={summary.absentCount} color={DANGER_COLOR} icon="✕" />
```

New:
```tsx
        <SummaryStat label="Présents" value={summary.presentCount} color={SUCCESS_COLOR} icon="checkmark-circle" />
        <SummaryStat label="En retard" value={summary.lateCount} color={WARNING_COLOR} icon="time" />
        <SummaryStat label="Absents" value={summary.absentCount} color={DANGER_COLOR} icon="close-circle" />
```

- [ ] **Step 11: `dashboard.tsx` — retrait du bouton "Scanner une carte" (Scan est désormais un onglet direct, ce bouton créerait une navigation push redondante par-dessus la tab bar)**

Old:
```tsx
      <Pressable style={styles.scanButton} onPress={() => router.push('/(teacher)/scan')}>
        <ThemedText style={styles.scanButtonIcon}>📷</ThemedText>
        <ThemedText style={styles.scanButtonLabel}>Scanner une carte</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
```

New:
```tsx
    </ThemedView>
  );
}
```

- [ ] **Step 12: `dashboard.tsx` — `SummaryStat` : type de l'icône + rendu**

Old:
```tsx
function SummaryStat({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.summaryStat}>
      <ThemedView style={[styles.summaryIcon, { backgroundColor: color }]}>
        <ThemedText style={styles.summaryIconLabel}>{icon}</ThemedText>
      </ThemedView>
```

New:
```tsx
function SummaryStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.summaryStat}>
      <ThemedView style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#ffffff" />
      </ThemedView>
```

- [ ] **Step 13: `dashboard.tsx` — nettoyage des styles devenus inutiles**

Old:
```tsx
  summaryIconLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
```

New: (supprimer ce bloc — plus utilisé, remplacé par `Ionicons`)

Old:
```tsx
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND_COLOR,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonIcon: {
    fontSize: 18,
  },
  scanButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

New:
```tsx
});
```

- [ ] **Step 14: `scan.tsx` — imports (retrait de `router`, plus utilisé après retrait du bouton retour)**

Old:
```tsx
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
```

New:
```tsx
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
```

- [ ] **Step 15: `scan.tsx` — retrait du bouton retour (Scan est un onglet, plus une navigation push/back)**

Old:
```tsx
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()}>
          <ThemedView type="backgroundElement" style={styles.backButton}>
            <ThemedText type="smallBold">← Retour</ThemedText>
          </ThemedView>
        </Pressable>

        <ThemedView type="backgroundElement" style={styles.checkpointSwitch}>
```

New:
```tsx
      <View style={styles.topBar}>
        <ThemedView type="backgroundElement" style={styles.checkpointSwitch}>
```

- [ ] **Step 16: `scan.tsx` — nettoyage du style devenu inutile**

Old:
```tsx
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkpointSwitch: {
```

New:
```tsx
  checkpointSwitch: {
```

- [ ] **Step 17: Vérification manuelle**

Run: `cd apps/mobile && npx tsc --noEmit`

Expected: pas de nouvelle erreur de type (en particulier pas d'import inutilisé signalé — `router` a bien été retiré de `dashboard.tsx` et `scan.tsx`, `Pressable` retiré de `scan.tsx`).

Puis manuellement dans le dev client : recharger l'app, vérifier que le login affiche l'icône école (au lieu de 🏫) et s'adapte en dark mode, que le dashboard affiche les icônes vectorielles à la place de ✓/⏱/✕ et n'a plus de bouton "Scanner une carte", que l'onglet Scan fonctionne sans bouton retour.

- [ ] **Step 18: Commit**

```bash
git add "apps/mobile/src/app/(auth)/login.tsx" "apps/mobile/src/app/(teacher)/dashboard.tsx" "apps/mobile/src/app/(teacher)/scan.tsx"
git commit -m "style(mobile): replace emoji icons with vector icons, dark-mode login, remove redundant scan back button"
```

---

### Task 13: Vérification manuelle de bout en bout

**Files:** aucun (validation uniquement)

- [ ] **Step 1: Backend + DB up**

Run: `docker ps` (vérifier `presence_db` healthy) puis, si besoin, `cd apps/backend && npm run start:dev`

- [ ] **Step 2: Mobile up**

Run: `cd apps/mobile && npx expo start -c`

- [ ] **Step 3: Parcours enseignant/surveillant**

Se connecter avec `surveillant1` / `changeme123`. Vérifier :
- 5 onglets visibles (Dashboard, Classe, Scan, Historique, Profil), icônes pleines/outline selon l'onglet actif
- Dashboard : résumé du jour inchangé, plus de bouton "Scanner une carte"
- Classe : liste des élèves avec badge présent/retard/absent
- Scan : caméra fonctionne, plus de bouton retour, sélecteur portail/classe inchangé
- Historique : liste des jours passés, tap sur un jour déplie le détail des scans
- Profil : identifiant `surveillant1`, rôle "Surveillant", nom de l'école, bouton Déconnexion fonctionnel (retour au login, tokens effacés)

- [ ] **Step 4: Parcours parent**

Si un compte `PARENT` existe (sinon noter dans le suivi de tâche que ce test est bloqué faute de compte de test — créer un compte parent dans `prisma/seed.ts` est hors scope de ce plan) : se connecter, vérifier les 3 onglets (Enfants, Historique, Profil), le sélecteur d'enfant si plusieurs enfants, et la déconnexion.

- [ ] **Step 5: Mode sombre**

Basculer le thème du téléphone en sombre, revenir sur Login puis Dashboard/Profil : vérifier qu'aucun texte/fond ne reste illisible (contraste correct sur les deux).

- [ ] **Step 6: Commit final (si des ajustements ont été faits pendant la vérification)**

```bash
git add -A
git commit -m "fix(mobile): address issues found during manual navigation verification"
```

(Ne committer que s'il y a eu des corrections réelles à cette étape — sinon, rien à committer.)
