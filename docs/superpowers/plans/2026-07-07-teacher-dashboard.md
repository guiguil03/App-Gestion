# Dashboard enseignant/surveillant avant scan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a dashboard screen (per-class attendance summary + recent scans) between login and the scan screen for teacher/surveillant roles, backed by a new class-assignment relation.

**Architecture:** Backend gets a `User` ↔ `SchoolClass` many-to-many relation (assigned via seed script, no admin UI yet) synced down to the mobile app's WatermelonDB as a new `assigned_classes` table. The mobile app reads assigned classes + today's local `attendance_records` reactively (WatermelonDB `.observe()`) to render the dashboard, replacing the direct-to-scan redirect.

**Tech Stack:** NestJS + Prisma (backend), Expo Router + WatermelonDB + React Native (mobile).

**Spec:** `docs/superpowers/specs/2026-07-07-teacher-dashboard-design.md`

**Note on testing:** Neither app has a test runner configured (no `test` script in either `package.json`, `apps/backend/test/` is empty). This plan uses `tsc --noEmit` / `nest build` for compile-time verification and manual (curl / app walkthrough) verification instead of automated tests — consistent with the rest of the codebase.

---

### Task 1: Backend — add User ↔ SchoolClass relation

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add the relation fields**

In the `SchoolClass` model, add one field after `students Student[]`:

```prisma
model SchoolClass {
  id        String    @id @default(uuid())
  schoolId  String    @map("school_id")
  name      String
  promotion String
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  school           School    @relation(fields: [schoolId], references: [id])
  students         Student[]
  assignedTeachers User[]    @relation("TeacherClasses")

  @@index([schoolId])
  @@map("school_classes")
}
```

In the `User` model, add one field after `school School? @relation(...)`:

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole
  schoolId     String?  @map("school_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  school          School?       @relation(fields: [schoolId], references: [id])
  assignedClasses SchoolClass[] @relation("TeacherClasses")

  @@map("users")
}
```

- [ ] **Step 2: Generate and apply the migration**

Run (from `apps/backend`):
```bash
cd apps/backend
npx prisma migrate dev --name add_teacher_class_assignments
```
Expected: creates `apps/backend/prisma/migrations/<timestamp>_add_teacher_class_assignments/migration.sql` containing a `CREATE TABLE "_TeacherClasses" ...` statement, applies it, and prints `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify the Prisma client compiles**

Run:
```bash
npx prisma generate && npx nest build
```
Expected: both commands exit 0 with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(backend): add many-to-many relation between User and SchoolClass"
```

---

### Task 2: Backend — assign classes via seed script

**Files:**
- Modify: `apps/backend/prisma/seed.ts:29-31`

- [ ] **Step 1: Connect the seeded class to the seeded surveillant**

Replace:
```ts
  await prisma.user.create({
    data: { username: 'surveillant1', passwordHash, role: 'SURVEILLANT', schoolId: school.id },
  });
```
with:
```ts
  await prisma.user.create({
    data: {
      username: 'surveillant1',
      passwordHash,
      role: 'SURVEILLANT',
      schoolId: school.id,
      assignedClasses: { connect: [{ id: schoolClass.id }] },
    },
  });
```

- [ ] **Step 2: Re-run the seed**

The dev database already has data from a previous seed run (this backend has been running throughout this session), so `npm run seed` will fail on the `username` unique constraint. Reset first:

Run (from `apps/backend`):
```bash
cd apps/backend
npx prisma migrate reset --force
```
Expected: drops and recreates the dev database, re-applies all migrations, then automatically re-runs the seed (Prisma runs the configured seed after `migrate reset`) — final output includes `École créée: <uuid>` and `Identifiants de test : surveillant1 / direction1, mot de passe "changeme123"`.

- [ ] **Step 3: Verify the assignment landed**

Run:
```bash
npx prisma studio
```
Open the `users` table, find `surveillant1`, confirm it has one related row in `_TeacherClasses` (or inspect via a one-off query if Studio isn't convenient — either way, confirm the relation is non-empty before moving on). Close Studio when done.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/seed.ts
git commit -m "feat(backend): assign the seeded class to the seeded surveillant account"
```

---

### Task 3: Backend — expose assigned classes through sync pull

**Files:**
- Modify: `apps/backend/src/modules/sync/sync.service.ts`
- Modify: `apps/backend/src/modules/sync/sync.controller.ts`

- [ ] **Step 1: Add a `userId` parameter and `assigned_classes` bucket to `pull()`**

In `apps/backend/src/modules/sync/sync.service.ts`, replace the `pull` method:

```ts
  async pull(schoolId: string, userId: string, lastPulledAt: number): Promise<PullResult> {
    const since = new Date(lastPulledAt);
    const timestamp = Date.now();

    const [school, classes, students, revokedCards, currentUser] = await Promise.all([
      this.prisma.school.findUnique({ where: { id: schoolId } }),
      this.prisma.schoolClass.findMany({ where: { schoolId, updatedAt: { gt: since } } }),
      this.prisma.student.findMany({ where: { schoolId, updatedAt: { gt: since } } }),
      this.prisma.studentCard.findMany({
        where: { revoked: true, student: { schoolId }, updatedAt: { gt: since } },
        select: { id: true },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, include: { assignedClasses: true } }),
    ]);

    return {
      timestamp,
      changes: {
        schools: bucket(school && school.updatedAt > since ? [toSchoolRow(school)] : []),
        school_classes: bucket(classes.map(toSchoolClassRow)),
        students: bucket(students.map(toStudentRow)),
        revoked_cards: bucket(revokedCards.map((c) => ({ id: c.id, card_id: c.id }))),
        assigned_classes: bucket((currentUser?.assignedClasses ?? []).map(toAssignedClassRow)),
      },
    };
  }
```

Add this helper function next to `toSchoolClassRow` (same file):

```ts
function toAssignedClassRow(schoolClass: { id: string }) {
  return {
    id: schoolClass.id,
    school_class_id: schoolClass.id,
  };
}
```

- [ ] **Step 2: Pass the current user's id from the controller**

In `apps/backend/src/modules/sync/sync.controller.ts`, replace the `pull` handler:

```ts
  @Get('pull')
  pull(@CurrentUser() user: AuthenticatedUser, @Query('lastPulledAt') lastPulledAt?: string) {
    return this.syncService.pull(this.tenant.schoolId, user.userId, lastPulledAt ? Number(lastPulledAt) : 0);
  }
```

Note: `AuthenticatedUser` (see `apps/backend/src/modules/auth/types.ts:8-14`) uses the field name `userId`, not `id`.

- [ ] **Step 3: Verify it compiles**

Run:
```bash
cd apps/backend
npx nest build
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Verify manually against the running backend**

The backend is already running on port 3000 (started earlier this session). Log in as `surveillant1` and pull:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"surveillant1","password":"changeme123"}' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).accessToken")
curl -s "http://localhost:3000/sync/pull?lastPulledAt=0" -H "Authorization: Bearer $TOKEN" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).changes.assigned_classes"
```
Expected: prints `{"created":[],"updated":[{"id":"<uuid>","school_class_id":"<same-uuid>"}],"deleted":[]}` — one row, matching the class connected in Task 2.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/sync/sync.service.ts apps/backend/src/modules/sync/sync.controller.ts
git commit -m "feat(backend): include assigned classes in the sync pull payload"
```

---

### Task 4: Mobile — local schema, migration, and models for assigned classes

**Files:**
- Modify: `apps/mobile/src/db/schema.ts`
- Modify: `apps/mobile/src/db/migrations.ts`
- Create: `apps/mobile/src/db/models/SchoolClass.ts`
- Create: `apps/mobile/src/db/models/AssignedClass.ts`
- Modify: `apps/mobile/src/db/database.ts`

- [ ] **Step 1: Bump the schema version and add the table**

In `apps/mobile/src/db/schema.ts`, change `version: 2` to `version: 3`, and add this table to the `tables` array (next to `school_classes`):

```ts
    tableSchema({
      name: 'assigned_classes',
      columns: [{ name: 'school_class_id', type: 'string', isIndexed: true }],
    }),
```

- [ ] **Step 2: Add the migration step**

Replace the full contents of `apps/mobile/src/db/migrations.ts`:

```ts
import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'schools',
          columns: [{ name: 'card_signing_public_key', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'assigned_classes',
          columns: [{ name: 'school_class_id', type: 'string', isIndexed: true }],
        }),
      ],
    },
  ],
});
```

- [ ] **Step 3: Create the `SchoolClass` model**

Create `apps/mobile/src/db/models/SchoolClass.ts`:

```ts
import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

export default class SchoolClass extends Model {
  static table = 'school_classes';

  @text('school_id') schoolId: string;
  @text('name') name: string;
  @text('promotion') promotion: string;
}
```

- [ ] **Step 4: Create the `AssignedClass` model**

Create `apps/mobile/src/db/models/AssignedClass.ts`:

```ts
import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

export default class AssignedClass extends Model {
  static table = 'assigned_classes';

  @text('school_class_id') schoolClassId: string;
}
```

- [ ] **Step 5: Register the new models**

In `apps/mobile/src/db/database.ts`, add the two imports and register the classes:

```ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import AssignedClass from '@/db/models/AssignedClass';
import AttendanceRecord from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import SchoolClass from '@/db/models/SchoolClass';
import Student from '@/db/models/Student';
import { migrations } from '@/db/migrations';
import { schema } from '@/db/schema';

function createDatabase(): Database | null {
  try {
    const adapter = new SQLiteAdapter({ schema, migrations, jsi: true });
    return new Database({ adapter, modelClasses: [Student, AttendanceRecord, School, SchoolClass, AssignedClass] });
  } catch {
    return null;
  }
}

export const database = createDatabase();
```

- [ ] **Step 6: Verify it compiles**

Run:
```bash
cd apps/mobile
npx tsc --noEmit
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/db/schema.ts apps/mobile/src/db/migrations.ts apps/mobile/src/db/models/SchoolClass.ts apps/mobile/src/db/models/AssignedClass.ts apps/mobile/src/db/database.ts
git commit -m "feat(mobile): sync assigned classes into a local WatermelonDB table"
```

---

### Task 5: Mobile — `useAssignedClasses` hook

**Files:**
- Create: `apps/mobile/src/features/classes/hooks/useAssignedClasses.ts`

- [ ] **Step 1: Write the hook**

Create `apps/mobile/src/features/classes/hooks/useAssignedClasses.ts`:

```ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AssignedClass from '@/db/models/AssignedClass';
import SchoolClass from '@/db/models/SchoolClass';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

/**
 * Classes assignées au compte connecté (relation User.assignedClasses côté
 * backend, cf. prisma/seed.ts — pas encore d'UI d'admin pour les gérer).
 */
export function useAssignedClasses(): SchoolClass[] {
  const database = useOptionalDatabase();
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    if (!database) return;

    const subscription = database
      .get<AssignedClass>('assigned_classes')
      .query()
      .observe()
      .subscribe(async (assignments) => {
        const classIds = assignments.map((assignment) => assignment.schoolClassId);
        if (classIds.length === 0) {
          setClasses([]);
          return;
        }
        const schoolClasses = await database
          .get<SchoolClass>('school_classes')
          .query(Q.where('id', Q.oneOf(classIds)))
          .fetch();
        setClasses(schoolClasses);
      });

    return () => subscription.unsubscribe();
  }, [database]);

  return classes;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd apps/mobile
npx tsc --noEmit
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/classes/hooks/useAssignedClasses.ts
git commit -m "feat(mobile): add useAssignedClasses hook"
```

---

### Task 6: Mobile — `useClassAttendanceSummary` hook

**Files:**
- Create: `apps/mobile/src/features/attendance/hooks/useClassAttendanceSummary.ts`

- [ ] **Step 1: Write the hook**

Create `apps/mobile/src/features/attendance/hooks/useClassAttendanceSummary.ts`:

```ts
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AttendanceRecord, { type Checkpoint } from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

export type RecentAttendanceRecord = {
  id: string;
  studentName: string;
  recordedAt: Date;
  checkpoint: Checkpoint;
  isLate: boolean;
};

export type ClassAttendanceSummary = {
  totalCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  recentRecords: RecentAttendanceRecord[];
};

const EMPTY_SUMMARY: ClassAttendanceSummary = {
  totalCount: 0,
  presentCount: 0,
  lateCount: 0,
  absentCount: 0,
  recentRecords: [],
};

const MAX_RECENT_RECORDS = 20;

/** Résumé de présence du jour pour une classe : élèves de la classe croisés avec leurs pointages depuis minuit. */
export function useClassAttendanceSummary(classId: string | null): ClassAttendanceSummary {
  const database = useOptionalDatabase();
  const [summary, setSummary] = useState<ClassAttendanceSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    if (!database || !classId) {
      setSummary(EMPTY_SUMMARY);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;
    let isCancelled = false;

    async function subscribeToRecords() {
      const students = await database!
        .get<Student>('students')
        .query(Q.where('school_class_id', classId as string))
        .fetch();

      if (isCancelled) return;

      if (students.length === 0) {
        setSummary(EMPTY_SUMMARY);
        return;
      }

      const studentIds = students.map((student) => student.id);
      const studentNameById = new Map(students.map((student) => [student.id, student.fullName]));

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      subscription = database!
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('student_id', Q.oneOf(studentIds)), Q.where('recorded_at', Q.gte(startOfDay.getTime())))
        .observe()
        .subscribe((records) => {
          const presentStudentIds = new Set(records.map((record) => record.studentId));
          const lateCount = records.filter((record) => record.isLate).length;
          const recentRecords = [...records]
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
            .slice(0, MAX_RECENT_RECORDS)
            .map((record) => ({
              id: record.id,
              studentName: studentNameById.get(record.studentId) ?? 'Élève inconnu',
              recordedAt: record.recordedAt,
              checkpoint: record.checkpoint,
              isLate: record.isLate,
            }));

          setSummary({
            totalCount: studentIds.length,
            presentCount: presentStudentIds.size,
            lateCount,
            absentCount: studentIds.length - presentStudentIds.size,
            recentRecords,
          });
        });
    }

    subscribeToRecords();

    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
    };
  }, [database, classId]);

  return summary;
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd apps/mobile
npx tsc --noEmit
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/attendance/hooks/useClassAttendanceSummary.ts
git commit -m "feat(mobile): add useClassAttendanceSummary hook"
```

---

### Task 7: Mobile — dashboard screen

**Files:**
- Create: `apps/mobile/src/app/(teacher)/index.tsx`
- Modify: `apps/mobile/src/navigation/roleGuard.ts`

- [ ] **Step 1: Write the dashboard screen**

Create `apps/mobile/src/app/(teacher)/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';
import { useClassAttendanceSummary } from '@/features/attendance/hooks/useClassAttendanceSummary';

const BRAND_COLOR = '#208AEF';

export default function TeacherDashboardScreen() {
  const database = useOptionalDatabase();
  const classes = useAssignedClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const summary = useClassAttendanceSummary(selectedClassId);

  if (!database) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Ce dashboard nécessite la base locale WatermelonDB, indisponible dans Expo Go. Lance
          l'app via un dev client (npx expo run:android ou EAS Build) pour tester cet écran.
        </ThemedText>
      </ThemedView>
    );
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
        Présence du jour
      </ThemedText>

      {classes.length > 1 && (
        <ThemedView type="backgroundElement" style={styles.classSwitch}>
          {classes.map((schoolClass) => (
            <Pressable
              key={schoolClass.id}
              style={[styles.classOption, selectedClassId === schoolClass.id && styles.classOptionActive]}
              onPress={() => setSelectedClassId(schoolClass.id)}
            >
              <ThemedText type="smallBold">{schoolClass.name}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <ThemedView type="backgroundElement" style={styles.summaryRow}>
        <SummaryStat label="Présents" value={summary.presentCount} />
        <SummaryStat label="En retard" value={summary.lateCount} />
        <SummaryStat label="Absents" value={summary.absentCount} />
      </ThemedView>

      <ThemedText type="smallBold" style={styles.sectionTitle}>
        Derniers scans
      </ThemedText>
      <FlatList
        data={summary.recentRecords}
        keyExtractor={(record) => record.id}
        style={styles.list}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">{item.studentName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {item.isLate ? ' — en retard' : ''}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Aucun scan aujourd'hui pour cette classe.</ThemedText>
        }
      />

      <Pressable style={styles.scanButton} onPress={() => router.push('/(teacher)/scan')}>
        <ThemedText style={styles.scanButtonLabel}>Scanner</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <ThemedView style={styles.summaryStat}>
      <ThemedText type="title" style={styles.summaryValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
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
    marginBottom: 4,
  },
  message: {
    textAlign: 'center',
    margin: 24,
  },
  classSwitch: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  classOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  classOptionActive: {
    backgroundColor: BRAND_COLOR,
  },
  summaryRow: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
  },
  sectionTitle: {
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
  row: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 2,
  },
  scanButton: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Point the initial route at the dashboard**

Replace `apps/mobile/src/navigation/roleGuard.ts` in full:

```ts
import type { UserRole } from '@/api/hooks/useLogin';

/** Where to land a user right after a successful login, based on their role. */
export function initialRouteForRole(role: UserRole): '/(teacher)' | '/(parent)/children' {
  switch (role) {
    case 'ENSEIGNANT':
    case 'SURVEILLANT':
      return '/(teacher)';
    case 'PARENT':
      return '/(parent)/children';
    case 'DIRECTION':
    case 'ADMIN':
      // Pas d'écran mobile dédié en v1 : ces rôles utilisent le dashboard web.
      // On les renvoie vers le stack enseignant en lecture, à affiner plus tard.
      return '/(teacher)';
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run:
```bash
cd apps/mobile
npx tsc --noEmit
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/\(teacher\)/index.tsx apps/mobile/src/navigation/roleGuard.ts
git commit -m "feat(mobile): add teacher dashboard screen as the post-login landing screen"
```

---

### Task 8: Mobile — back button on the scan screen

**Files:**
- Modify: `apps/mobile/src/app/(teacher)/scan.tsx`

- [ ] **Step 1: Add the back button**

In `apps/mobile/src/app/(teacher)/scan.tsx`, this is the only import change — insert one new line, leave every other existing import (`Q`, `ThemedView`, `useOptionalDatabase`, `Buffer`, `ScanFeedbackBanner`, `useRecordAttendance`, `Checkpoint`, `School`, `SyncStatusBadge`, `parseCardQrCode`/`verifyCardSignature`) untouched:

```diff
 import { useRef, useState } from 'react';
 import { Pressable, StyleSheet } from 'react-native';
+import { router } from 'expo-router';
 import { CameraView, useCameraPermissions } from 'expo-camera';
```

In the main return block (the one with `<CameraView .../>`), add the back button right after `<CameraView ... />` and before `<ThemedView type="backgroundElement" style={styles.checkpointSwitch}>`:

```tsx
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ThemedText type="smallBold" style={styles.backButtonLabel}>
          ← Retour
        </ThemedText>
      </Pressable>

```

Change the `checkpointSwitch` style's `left` from `24` to `104` so it no longer overlaps the new back button:

```ts
  checkpointSwitch: {
    position: 'absolute',
    top: 48,
    left: 104,
    right: 24,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
```

Add these two new styles to the `StyleSheet.create` call (next to `checkpointSwitch`):

```ts
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButtonLabel: {
    color: '#ffffff',
  },
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd apps/mobile
npx tsc --noEmit
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/app/\(teacher\)/scan.tsx
git commit -m "feat(mobile): add a back button to the scan screen to return to the dashboard"
```

---

### Task 9: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm the backend serves the assignment**

Backend must be running (`cd apps/backend && npm run start:dev` if not already). Re-run the curl check from Task 3, Step 4, and confirm the `assigned_classes` bucket is non-empty.

- [ ] **Step 2: Confirm the mobile app dashboard flow**

With Metro running (`cd apps/mobile && npx expo start --dev-client`) and the dev-client build connected:
1. Log in as `surveillant1` / `changeme123`.
2. Confirm you land on the dashboard (not the camera) and it shows the `CM2 A` class with 0/0/2 (present/late/absent out of the 2 seeded students) since no scans have happened yet.
3. Tap "Scanner", confirm the camera screen opens with a visible "← Retour" button that doesn't overlap the portail/classe switch.
4. Tap "← Retour", confirm you're back on the dashboard.
5. Scan one of the seeded students' QR codes (printed to the console by `prisma/seed.ts` during Task 2's reset — re-run `npx prisma migrate reset --force` and check the terminal output if you no longer have it), confirm the feedback banner shows the pointage was recorded, tap "← Retour", and confirm the dashboard's summary and "Derniers scans" list updated to reflect the new scan without needing to reload the app.

- [ ] **Step 3: Update the spec's status (optional)**

If everything in Steps 1–2 works, no further action needed — this plan is complete.
