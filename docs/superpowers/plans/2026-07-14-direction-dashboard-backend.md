# Dashboard Direction — Backend (apps/backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the backend API surface the Direction web dashboard needs: automatic absence detection/notification/justification, class management, teacher/surveillant account management, and dashboard stats/alerts/real-time stream — on top of the existing NestJS + Prisma backend in `apps/backend`.

**Architecture:** New NestJS modules (`AbsencesModule`, `ClassesModule`, `StaffModule`, `DashboardModule`) following the exact conventions already in the codebase (`JwtAuthGuard` + `RolesGuard` + `TenantContext`, `EventEmitter2` for cross-module events, Prisma for persistence). Absence detection runs as a `@Cron` job and is idempotent via a DB unique constraint. Real-time dashboard updates use NestJS's native `@Sse()` (no new infra like Socket.IO/Redis).

**Tech Stack:** NestJS 10, Prisma 5 (PostgreSQL), `@nestjs/schedule` (new dependency), `@nestjs/event-emitter` (existing), Jest + `@nestjs/testing` (new — **no test infrastructure exists in this repo today**, Task 1 bootstraps it).

**Companion plan:** The Next.js dashboard frontend that consumes these endpoints is a **separate plan** (`docs/superpowers/plans/<date>-direction-dashboard-frontend.md`, written after this one lands), because backend and frontend are independently testable subsystems and the frontend depends on these endpoints existing.

---

## Before you start

Read `docs/superpowers/specs/2026-07-14-direction-dashboard-design.md` for the full rationale. Key facts this plan assumes:

- `apps/backend/prisma/schema.prisma` already has **uncommitted** local changes: an `Absence` model and `User.expoPushToken`. This plan adds one more field (`User.disabledAt`) and generates the migration for all three at once (Task 2).
- The backend has **no test infrastructure** at all (no Jest config, no `*.spec.ts` files, no `test` script). Task 1 sets this up.
- No global route prefix exists — routes are mounted directly (`/students`, `/auth/login`, etc.), CORS is already enabled globally (`app.enableCors()` in `src/main.ts`).
- `PrismaModule` is `@Global()` — new feature modules do not need to import it to inject `PrismaService`.

## File Structure

```
apps/backend/
  package.json                                    [modify: add jest config + deps]
  prisma/schema.prisma                             [modify: add User.disabledAt]
  src/
    common/
      accounts/
        generate-credentials.ts                    [create: shared username/password helpers]
        generate-credentials.spec.ts                [create]
      guards/jwt-auth.guard.ts                      (unchanged — see auth/strategies/jwt.strategy.ts)
    modules/
      auth/strategies/jwt.strategy.ts               [modify: reject disabled accounts]
      auth/strategies/jwt.strategy.spec.ts           [create]
      students/students.service.ts                  [modify: use shared credentials helper]
      attendance/attendance.service.ts               [modify: clear stale absence on check-in]
      attendance/attendance.service.spec.ts           [create]
      absences/
        absences.module.ts                          [create]
        absences.service.ts                         [create]
        absences.service.spec.ts                     [create]
        absences.controller.ts                       [create]
        absence-detection.job.ts                     [create]
        date-key.ts                                  [create: shared local-date helper]
        events/absence-marked.event.ts                [create]
        dto/justify-absence.dto.ts                    [create]
      notifications/
        notifications.service.ts                      [modify: push + absence notification]
        notifications.service.spec.ts                  [create]
        notifications.module.ts                        [modify: register PushProvider]
        providers/push-provider.ts                      [create]
        providers/push-provider.expo.ts                  [create]
        providers/push-provider.mock.ts                   [create]
      classes/
        classes.module.ts                             [create]
        classes.service.ts                            [create]
        classes.service.spec.ts                        [create]
        classes.controller.ts                          [create]
        dto/create-class.dto.ts                         [create]
        dto/update-class.dto.ts                         [create]
      staff/
        staff.module.ts                                [create]
        staff.service.ts                               [create]
        staff.service.spec.ts                           [create]
        staff.controller.ts                             [create]
        dto/create-staff.dto.ts                          [create]
      dashboard/
        dashboard.module.ts                            [create]
        dashboard.service.ts                            [create]
        dashboard.service.spec.ts                       [create]
        dashboard.controller.ts                         [create]
    app.module.ts                                    [modify: register new modules + ScheduleModule]
```

---

### Task 1: Bootstrap Jest test infrastructure

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/app.smoke.spec.ts`

- [ ] **Step 1: Add test dependencies and scripts**

Edit `apps/backend/package.json`:
- Add to `"scripts"`: `"test": "jest"`, `"test:watch": "jest --watch"`
- Add to `"devDependencies"`: `"@nestjs/testing": "^10.4.15"`, `"@types/jest": "^29.5.14"`, `"jest": "^29.7.0"`, `"ts-jest": "^29.2.5"`
- Add a top-level `"jest"` key:

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" }
}
```

- [ ] **Step 2: Install**

Run: `cd apps/backend && npm install`
Expected: installs without error, `node_modules/.bin/jest` exists.

- [ ] **Step 3: Write a smoke test**

Create `apps/backend/src/app.smoke.spec.ts`:

```ts
describe('jest bootstrap', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `cd apps/backend && npm test`
Expected: `PASS src/app.smoke.spec.ts`, 1 test passed.

- [ ] **Step 5: Add the scheduling dependency needed later in this plan**

Edit `apps/backend/package.json`, add to `"dependencies"`: `"@nestjs/schedule": "^4.1.0"`

Run: `cd apps/backend && npm install`
Expected: installs without error.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/package.json apps/backend/package-lock.json apps/backend/src/app.smoke.spec.ts
git commit -m "chore(backend): bootstrap Jest and add @nestjs/schedule"
```

---

### Task 2: Prisma migration — `disabledAt` + existing uncommitted `Absence`/`expoPushToken`

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add `disabledAt` to `User`**

In `apps/backend/prisma/schema.prisma`, in `model User`, add the field right after `expoPushToken`:

```prisma
  expoPushToken String? @map("expo_push_token")
  // Désactivation soft d'un compte staff (ENSEIGNANT/SURVEILLANT) par la
  // Direction — rejeté par JwtAuthGuard dès la prochaine requête, pas
  // seulement au prochain login.
  disabledAt    DateTime? @map("disabled_at")
```

- [ ] **Step 2: Generate and apply the migration**

Run: `cd apps/backend && npm run prisma:migrate -- --name absences_and_staff_accounts`
Expected: prompts complete without data-loss warnings, creates a new folder under `apps/backend/prisma/migrations/`, ends with `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate the Prisma client**

Run: `cd apps/backend && npm run prisma:generate`
Expected: `Generated Prisma Client` with no errors — this makes `prisma.absence`, `User.expoPushToken`, and `User.disabledAt` available on the typed client used by later tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(backend): add User.disabledAt and migrate Absence/expoPushToken/disabledAt"
```

---

### Task 3: Shared account-credentials helper (DRY) + refactor `StudentsService`

`StudentsService` already has private `generatePassword`/`generateUniqueUsername`/`normalize` helpers (`apps/backend/src/modules/students/students.service.ts:11-27,138-147`). `StaffService` (Task 9) needs the exact same logic. Extract once, reuse in both.

**Files:**
- Create: `apps/backend/src/common/accounts/generate-credentials.ts`
- Create: `apps/backend/src/common/accounts/generate-credentials.spec.ts`
- Modify: `apps/backend/src/modules/students/students.service.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/common/accounts/generate-credentials.spec.ts`:

```ts
import { generatePassword, generateUniqueUsername, normalizeUsernamePart } from '@/common/accounts/generate-credentials';

describe('normalizeUsernamePart', () => {
  it('strips accents, spaces and lowercases', () => {
    expect(normalizeUsernamePart('Jean-Éric Ndélé')).toBe('jeanericndele');
  });
});

describe('generatePassword', () => {
  it('generates an 8-character password by default with no ambiguous characters', () => {
    const password = generatePassword();
    expect(password).toHaveLength(8);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});

describe('generateUniqueUsername', () => {
  it('appends a numeric suffix when the base username is taken', async () => {
    const findUnique = jest.fn().mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null);
    const prisma = { user: { findUnique } } as any;

    const username = await generateUniqueUsername(prisma, 'Jean', 'Dupont');

    expect(username).toBe('jean.dupont2');
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npm test -- generate-credentials`
Expected: FAIL — `Cannot find module '@/common/accounts/generate-credentials'`

- [ ] **Step 3: Implement**

Create `apps/backend/src/common/accounts/generate-credentials.ts`:

```ts
import { randomInt } from 'node:crypto';

import type { PrismaService } from '@/database/prisma.service';

// Sans caractères ambigus à la lecture/saisie (0/O, 1/l/I).
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function normalizeUsernamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function generatePassword(length = 8): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

export async function generateUniqueUsername(
  prisma: Pick<PrismaService, 'user'>,
  firstName: string,
  lastName: string,
): Promise<string> {
  const base = lastName
    ? `${normalizeUsernamePart(firstName)}.${normalizeUsernamePart(lastName)}`
    : normalizeUsernamePart(firstName);
  let candidate = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix++;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/backend && npm test -- generate-credentials`
Expected: PASS, 3 tests.

- [ ] **Step 5: Refactor `StudentsService` to use the shared helper**

In `apps/backend/src/modules/students/students.service.ts`:
- Delete the local `PASSWORD_ALPHABET` constant, `normalize` function, `generatePassword` function, and the private `generateUniqueUsername` method (lines 11-27 and 138-147).
- Add the import: `import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';`
- Replace every call to `this.generateUniqueUsername(...)` with `generateUniqueUsername(this.prisma, ...)`.

The two call sites are in `provisionAccount` (`const username = existing?.username ?? (await this.generateUniqueUsername(student.firstName, student.lastName));` → `... generateUniqueUsername(this.prisma, student.firstName, student.lastName));`) and `provisionParentAccount` (`const username = await this.generateUniqueUsername(parentGuardian.fullName, '');` → `... generateUniqueUsername(this.prisma, parentGuardian.fullName, '');`).

- [ ] **Step 6: Verify nothing else references the removed private members**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/common/accounts apps/backend/src/modules/students/students.service.ts
git commit -m "refactor(backend): extract shared account-credentials helper"
```

---

### Task 4: `JwtStrategy` rejects disabled accounts

**Files:**
- Modify: `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/backend/src/modules/auth/strategies/jwt.strategy.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/auth/strategies/jwt.strategy.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import type { AuthenticatedUser } from '@/modules/auth/types';

function buildPayload(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    userId: 'user-1',
    username: 'direction1',
    role: 'DIRECTION',
    schoolId: 'school-1',
    studentId: null,
    type: 'access',
    ...overrides,
  };
}

describe('JwtStrategy', () => {
  it('accepts a valid access token for an active account', async () => {
    const findUnique = jest.fn().mockResolvedValue({ disabledAt: null });
    const strategy = new JwtStrategy({ user: { findUnique } } as any);

    const result = await strategy.validate(buildPayload());

    expect(result.userId).toBe('user-1');
  });

  it('rejects a refresh token used as an access token', async () => {
    const findUnique = jest.fn().mockResolvedValue({ disabledAt: null });
    const strategy = new JwtStrategy({ user: { findUnique } } as any);

    await expect(strategy.validate(buildPayload({ type: 'refresh' }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a disabled account even with a valid token', async () => {
    const findUnique = jest.fn().mockResolvedValue({ disabledAt: new Date() });
    const strategy = new JwtStrategy({ user: { findUnique } } as any);

    await expect(strategy.validate(buildPayload())).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npm test -- jwt.strategy`
Expected: FAIL — `validate` currently ignores `disabledAt` and the constructor doesn't accept a `PrismaService` argument, so the third test fails (account not rejected) and/or TS fails to compile the mock argument.

- [ ] **Step 3: Implement**

Replace `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser } from '@/modules/auth/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    // Un refresh token partage la même forme de payload qu'un access token
    // (voir types.ts) : sans ce contrôle, il serait accepté ici comme si
    // c'était un access token valide pendant toute sa durée de vie (30j).
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }

    // Vérifié à chaque requête (pas seulement au login) pour qu'une
    // désactivation de compte staff soit immédiate.
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.disabledAt) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/backend && npm test -- jwt.strategy`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/auth/strategies/jwt.strategy.ts apps/backend/src/modules/auth/strategies/jwt.strategy.spec.ts
git commit -m "feat(backend): reject disabled accounts on every authenticated request"
```

---

### Task 5: Shared local-date helper for absences

**Files:**
- Create: `apps/backend/src/modules/absences/date-key.ts`

- [ ] **Step 1: Implement (no test needed — trivial pure formatting used and covered indirectly by Task 6/7 tests)**

Create `apps/backend/src/modules/absences/date-key.ts`:

```ts
/**
 * Clé de date locale ("YYYY-MM-DD") utilisée par `Absence.date`. Basée sur
 * les composants locaux de `Date` (pas `toISOString`, qui est en UTC) pour
 * rester cohérente avec `LateDetectionService`, qui suppose déjà que
 * l'heure serveur == l'heure de l'école (voir late-detection.service.ts).
 */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/absences/date-key.ts
git commit -m "feat(backend): add shared local date-key helper for absences"
```

---

### Task 6: `AbsencesModule` — detection, listing, justification

**Files:**
- Create: `apps/backend/src/modules/absences/events/absence-marked.event.ts`
- Create: `apps/backend/src/modules/absences/dto/justify-absence.dto.ts`
- Create: `apps/backend/src/modules/absences/absences.service.ts`
- Create: `apps/backend/src/modules/absences/absences.service.spec.ts`
- Create: `apps/backend/src/modules/absences/absence-detection.job.ts`
- Create: `apps/backend/src/modules/absences/absences.controller.ts`
- Create: `apps/backend/src/modules/absences/absences.module.ts`

- [ ] **Step 1: Event and DTO**

Create `apps/backend/src/modules/absences/events/absence-marked.event.ts`:

```ts
export const ABSENCE_MARKED_EVENT = 'absence.marked';

export class AbsenceMarkedEvent {
  constructor(
    public readonly absenceId: string,
    public readonly studentId: string,
    public readonly schoolId: string,
    public readonly date: string,
  ) {}
}
```

Create `apps/backend/src/modules/absences/dto/justify-absence.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class JustifyAbsenceDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
```

- [ ] **Step 2: Write the failing tests for `AbsencesService`**

Create `apps/backend/src/modules/absences/absences.service.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';

import { AbsencesService } from '@/modules/absences/absences.service';
import { ABSENCE_MARKED_EVENT } from '@/modules/absences/events/absence-marked.event';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    school: { findMany: jest.fn().mockResolvedValue([]) },
    student: { findMany: jest.fn().mockResolvedValue([]) },
    attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    absence: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: { findFirst: jest.fn() },
    ...overrides,
  } as any;
}

describe('AbsencesService.detectAbsences', () => {
  it('does nothing before the school deadline (reference time + tolerance)', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'school-1', deletedAt: null, attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 },
        ]),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T07:00:00'));

    expect(prisma.student.findMany).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('marks absent a student with no PORTAIL/ENTREE record after the deadline, and emits an event', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'school-1', deletedAt: null, attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 },
        ]),
      },
      student: { findMany: jest.fn().mockResolvedValue([{ id: 'student-1' }, { id: 'student-2' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([{ studentId: 'student-2' }]) },
      absence: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'absence-1', studentId: 'student-1' }),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T08:00:00'));

    expect(prisma.absence.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.absence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { studentId: 'student-1', date: '2026-07-14' } }),
    );
    expect(events.emit).toHaveBeenCalledWith(
      ABSENCE_MARKED_EVENT,
      expect.objectContaining({ studentId: 'student-1', schoolId: 'school-1', date: '2026-07-14' }),
    );
  });

  it('does not re-process a student already marked absent today (idempotent)', async () => {
    const prisma = buildPrisma({
      school: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'school-1', deletedAt: null, attendanceReferenceTime: '07:30', attendanceToleranceMinutes: 15 },
        ]),
      },
      student: { findMany: jest.fn().mockResolvedValue([{ id: 'student-1' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      absence: {
        findMany: jest.fn().mockResolvedValue([{ studentId: 'student-1' }]),
        upsert: jest.fn(),
      },
    });
    const events = { emit: jest.fn() } as any;
    const service = new AbsencesService(prisma, events);

    await service.detectAbsences(new Date('2026-07-14T08:00:00'));

    expect(prisma.absence.upsert).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe('AbsencesService.justify', () => {
  it('lets DIRECTION justify any absence in its school', async () => {
    const prisma = buildPrisma({
      absence: {
        findFirst: jest.fn().mockResolvedValue({ id: 'absence-1', studentId: 'student-1' }),
        update: jest.fn().mockResolvedValue({ id: 'absence-1', justified: true }),
      },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    const result = await service.justify('absence-1', 'school-1', 'Maladie', { role: 'DIRECTION', userId: 'dir-1' });

    expect(result.justified).toBe(true);
    expect(prisma.absence.update).toHaveBeenCalledWith({
      where: { id: 'absence-1' },
      data: { justified: true, justificationReason: 'Maladie' },
    });
  });

  it('rejects a PARENT justifying an absence of a child that is not theirs', async () => {
    const prisma = buildPrisma({
      absence: { findFirst: jest.fn().mockResolvedValue({ id: 'absence-1', studentId: 'student-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new AbsencesService(prisma, { emit: jest.fn() } as any);

    await expect(
      service.justify('absence-1', 'school-1', 'Maladie', { role: 'PARENT', userId: 'parent-1' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/backend && npm test -- absences.service`
Expected: FAIL — `Cannot find module '@/modules/absences/absences.service'`

- [ ] **Step 4: Implement `AbsencesService`**

Create `apps/backend/src/modules/absences/absences.service.ts`:

```ts
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '@/database/prisma.service';
import { dateKey } from '@/modules/absences/date-key';
import { ABSENCE_MARKED_EVENT, AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function deadlineMinutes(referenceTime: string, toleranceMinutes: number): number {
  const [hours, minutes] = referenceTime.split(':').map(Number);
  return hours * 60 + minutes + toleranceMinutes;
}

@Injectable()
export class AbsencesService {
  private readonly logger = new Logger(AbsencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Marque absent tout élève sans pointage PORTAIL/ENTREE du jour, pour les
   * écoles ayant dépassé leur heure de référence + tolérance. Idempotent :
   * un élève déjà marqué absent aujourd'hui n'est jamais retraité (voir
   * `Absence.@@unique([studentId, date])`). Appelée par `AbsenceDetectionJob`
   * toutes les 5 minutes — `now` est un paramètre pour rester testable.
   */
  async detectAbsences(now: Date = new Date()): Promise<void> {
    const date = dateKey(now);
    const schools = await this.prisma.school.findMany({ where: { deletedAt: null } });

    for (const school of schools) {
      const deadline = deadlineMinutes(school.attendanceReferenceTime, school.attendanceToleranceMinutes);
      if (minutesSinceMidnight(now) < deadline) continue;

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [students, presentRecords, existingAbsences] = await Promise.all([
        this.prisma.student.findMany({ where: { schoolId: school.id, deletedAt: null }, select: { id: true } }),
        this.prisma.attendanceRecord.findMany({
          where: {
            student: { schoolId: school.id },
            checkpoint: 'PORTAIL',
            direction: 'ENTREE',
            recordedAt: { gte: startOfDay },
          },
          select: { studentId: true },
        }),
        this.prisma.absence.findMany({ where: { student: { schoolId: school.id }, date }, select: { studentId: true } }),
      ]);

      const presentIds = new Set(presentRecords.map((r) => r.studentId));
      const alreadyMarkedIds = new Set(existingAbsences.map((a) => a.studentId));
      const toMark = students.filter((s) => !presentIds.has(s.id) && !alreadyMarkedIds.has(s.id));

      for (const student of toMark) {
        const absence = await this.prisma.absence.upsert({
          where: { studentId_date: { studentId: student.id, date } },
          create: { studentId: student.id, date },
          update: {},
        });
        this.logger.log(`Absence ${absence.id} marquée pour l'élève ${student.id} (${date})`);
        this.events.emit(ABSENCE_MARKED_EVENT, new AbsenceMarkedEvent(absence.id, student.id, school.id, date));
      }
    }
  }

  async list(schoolId: string, schoolClassId?: string) {
    return this.prisma.absence.findMany({
      where: { student: { schoolId, schoolClassId } },
      include: { student: true },
      orderBy: { date: 'desc' },
    });
  }

  async justify(
    absenceId: string,
    schoolId: string,
    reason: string,
    user: { role: string; userId: string },
  ) {
    const absence = await this.prisma.absence.findFirst({ where: { id: absenceId, student: { schoolId } } });
    if (!absence) throw new ForbiddenException('Absence introuvable');

    if (user.role === 'PARENT') {
      const link = await this.prisma.user.findFirst({
        where: { id: user.userId, children: { some: { id: absence.studentId } } },
      });
      if (!link) throw new ForbiddenException("Cette absence ne concerne pas un enfant de ce compte");
    }

    return this.prisma.absence.update({
      where: { id: absenceId },
      data: { justified: true, justificationReason: reason },
    });
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd apps/backend && npm test -- absences.service`
Expected: PASS, 5 tests.

- [ ] **Step 6: Cron job**

Create `apps/backend/src/modules/absences/absence-detection.job.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AbsencesService } from '@/modules/absences/absences.service';

@Injectable()
export class AbsenceDetectionJob {
  constructor(private readonly absences: AbsencesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    await this.absences.detectAbsences();
  }
}
```

- [ ] **Step 7: Controller**

Create `apps/backend/src/modules/absences/absences.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { AbsencesService } from '@/modules/absences/absences.service';
import { JustifyAbsenceDto } from '@/modules/absences/dto/justify-absence.dto';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(
    private readonly absencesService: AbsencesService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Roles('DIRECTION')
  list(@Query('schoolClassId') schoolClassId?: string) {
    return this.absencesService.list(this.tenant.schoolId, schoolClassId);
  }

  @Patch(':absenceId/justify')
  @Roles('DIRECTION', 'PARENT')
  justify(
    @Param('absenceId') absenceId: string,
    @Body() dto: JustifyAbsenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.absencesService.justify(absenceId, this.tenant.schoolId, dto.reason, user);
  }
}
```

- [ ] **Step 8: Module**

Create `apps/backend/src/modules/absences/absences.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { AbsenceDetectionJob } from '@/modules/absences/absence-detection.job';
import { AbsencesController } from '@/modules/absences/absences.controller';
import { AbsencesService } from '@/modules/absences/absences.service';

@Module({
  providers: [AbsencesService, AbsenceDetectionJob],
  controllers: [AbsencesController],
  exports: [AbsencesService],
})
export class AbsencesModule {}
```

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/absences
git commit -m "feat(backend): add automatic absence detection, listing and justification"
```

---

### Task 7: `AttendanceService` clears a stale absence on late check-in

A student who arrives late (after the tolerance deadline used by `AbsenceDetectionJob`, but before the school day ends) must not remain marked absent once they scan in.

**Files:**
- Modify: `apps/backend/src/modules/attendance/attendance.service.ts`
- Create: `apps/backend/src/modules/attendance/attendance.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/attendance/attendance.service.spec.ts`:

```ts
import { AttendanceService } from '@/modules/attendance/attendance.service';
import { LateDetectionService } from '@/modules/attendance/late-detection.service';

function buildDeps() {
  const prisma = {
    attendanceSession: { findFirst: jest.fn() },
    school: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'school-1',
      attendanceReferenceTime: '07:30',
      attendanceToleranceMinutes: 15,
    }) },
    attendanceRecord: { upsert: jest.fn().mockResolvedValue({ id: 'record-1' }) },
    absence: { deleteMany: jest.fn() },
  } as any;
  const students = { assertBelongsToSchool: jest.fn().mockResolvedValue({ id: 'student-1', schoolClassId: 'class-1' }) } as any;
  const events = { emit: jest.fn() } as any;
  const service = new AttendanceService(prisma, students, new LateDetectionService(), events);
  return { service, prisma, students };
}

describe('AttendanceService.recordFromSync — stale absence cleanup', () => {
  it('deletes any existing Absence for the student on a late PORTAIL/ENTREE check-in', async () => {
    const { service, prisma } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-1',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'entree',
        recorded_at: '2026-07-14T08:00:00',
        session_id: undefined,
      } as any,
    );

    expect(prisma.absence.deleteMany).toHaveBeenCalledWith({ where: { studentId: 'student-1', date: '2026-07-14' } });
  });

  it('does not touch absences for a SORTIE record', async () => {
    const { service, prisma } = buildDeps();

    await service.recordFromSync(
      { schoolId: 'school-1' } as any,
      {
        id: 'raw-2',
        student_id: 'student-1',
        checkpoint: 'portail',
        direction: 'sortie',
        recorded_at: '2026-07-14T16:00:00',
        session_id: undefined,
      } as any,
    );

    expect(prisma.absence.deleteMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npm test -- attendance.service`
Expected: FAIL — `prisma.absence.deleteMany` is never called (feature doesn't exist yet).

- [ ] **Step 3: Implement**

In `apps/backend/src/modules/attendance/attendance.service.ts`, add the import and the cleanup call. Add near the top:

```ts
import { dateKey } from '@/modules/absences/date-key';
```

In `recordFromSync`, right after the `this.logger.log(...)` line that follows the `upsert`/`catch` block (i.e. after the record is successfully created or the idempotent-replay early return did **not** trigger), add:

```ts
    // Un pointage PORTAIL/ENTREE (même tardif) annule une absence déjà
    // marquée par AbsenceDetectionJob pour ce jour — un retard n'est pas une
    // absence.
    if (record && toCheckpoint(raw.checkpoint) === Checkpoint.PORTAIL && toDirection(raw.direction) === AttendanceDirection.ENTREE) {
      await this.prisma.absence.deleteMany({ where: { studentId: student.id, date: dateKey(recordedAt) } });
    }
```

Place this right before the final `return record;` statement, after the `this.logger.log(...)` call (so it does not run on the early-return idempotent-replay path, which is correct: a replay of an already-processed record doesn't need to redo the cleanup, though re-running it would be harmless — keeping it out of that path just avoids a redundant query).

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/backend && npm test -- attendance.service`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/attendance/attendance.service.ts apps/backend/src/modules/attendance/attendance.service.spec.ts
git commit -m "feat(backend): clear stale absence when a late check-in arrives"
```

---

### Task 8: Push notifications + absence notification

**Files:**
- Create: `apps/backend/src/modules/notifications/providers/push-provider.ts`
- Create: `apps/backend/src/modules/notifications/providers/push-provider.expo.ts`
- Create: `apps/backend/src/modules/notifications/providers/push-provider.mock.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.module.ts`
- Modify: `apps/backend/src/modules/notifications/notifications.service.ts`
- Create: `apps/backend/src/modules/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Provider abstraction (mirrors `SmsProvider`)**

Create `apps/backend/src/modules/notifications/providers/push-provider.ts`:

```ts
export type PushSendResult = {
  status: string;
};

// Classe abstraite plutôt qu'interface : même raison que SmsProvider — sert
// de jeton d'injection Nest (`{ provide: PushProvider, useClass: ... }`).
export abstract class PushProvider {
  abstract send(expoPushToken: string, title: string, body: string): Promise<PushSendResult>;
}
```

Create `apps/backend/src/modules/notifications/providers/push-provider.expo.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';

import { PushProvider, type PushSendResult } from '@/modules/notifications/providers/push-provider';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Contrairement au SMS (pas de contrat opérateur choisi), l'API push d'Expo
// ne nécessite aucune inscription préalable pour envoyer à un token de
// device — utilisable directement en production.
@Injectable()
export class ExpoPushProvider extends PushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);

  async send(expoPushToken: string, title: string, body: string): Promise<PushSendResult> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body }),
    });
    if (!response.ok) {
      this.logger.warn(`Échec envoi push (HTTP ${response.status})`);
      return { status: 'failed' };
    }
    return { status: 'sent' };
  }
}
```

Create `apps/backend/src/modules/notifications/providers/push-provider.mock.ts` (used only in tests):

```ts
import { Injectable, Logger } from '@nestjs/common';

import { PushProvider, type PushSendResult } from '@/modules/notifications/providers/push-provider';

@Injectable()
export class MockPushProvider extends PushProvider {
  private readonly logger = new Logger(MockPushProvider.name);

  async send(expoPushToken: string, title: string, body: string): Promise<PushSendResult> {
    this.logger.log(`[Push mock] à ${expoPushToken} : ${title} — ${body}`);
    return { status: 'sent-mock' };
  }
}
```

- [ ] **Step 2: Write the failing tests for the extended `NotificationsService`**

Create `apps/backend/src/modules/notifications/notifications.service.spec.ts`:

```ts
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AttendanceRecordedEvent } from '@/modules/attendance/events/attendance-recorded.event';
import { AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';

function buildDeps() {
  const prisma = {
    student: { findUnique: jest.fn() },
    parentGuardian: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  } as any;
  const sms = { send: jest.fn().mockResolvedValue({ status: 'sent-mock' }) } as any;
  const push = { send: jest.fn().mockResolvedValue({ status: 'sent-mock' }) } as any;
  const service = new NotificationsService(prisma, sms, push);
  return { service, prisma, sms, push };
}

describe('NotificationsService.handleAbsenceMarked', () => {
  it('sends SMS to parents with SMS/BOTH channel and push to linked PARENT accounts with a token', async () => {
    const { service, prisma, sms, push } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      { id: 'pg-1', phoneNumber: '+243900000001', notificationChannel: 'SMS' },
      { id: 'pg-2', phoneNumber: '+243900000002', notificationChannel: 'PUSH' },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' }]);

    await service.handleAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-1', 'school-1', '2026-07-14'));

    expect(sms.send).toHaveBeenCalledWith('+243900000001', expect.stringContaining('Grace Nkumu'));
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith('ExponentPushToken[abc]', 'Absence', expect.stringContaining('Grace Nkumu'));
  });

  it('does nothing if the student cannot be found', async () => {
    const { service, prisma, sms, push } = buildDeps();
    prisma.student.findUnique.mockResolvedValue(null);

    await service.handleAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-1', 'school-1', '2026-07-14'));

    expect(sms.send).not.toHaveBeenCalled();
    expect(push.send).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.handleAttendanceRecorded — push', () => {
  it('also sends push to linked PARENT accounts with a token, in addition to existing SMS behaviour', async () => {
    const { service, prisma, sms, push } = buildDeps();
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      lastName: 'Nkumu',
      middleName: null,
      firstName: 'Grace',
      school: { name: 'École Test' },
    });
    prisma.parentGuardian.findMany.mockResolvedValue([
      { id: 'pg-1', phoneNumber: '+243900000001', notificationChannel: 'BOTH' },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', expoPushToken: 'ExponentPushToken[abc]' }]);

    await service.handleAttendanceRecorded({
      studentId: 'student-1',
      recordedAt: new Date('2026-07-14T07:31:00'),
      isLate: true,
    } as any);

    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(push.send).toHaveBeenCalledWith('ExponentPushToken[abc]', 'Arrivée', expect.stringContaining('Grace Nkumu'));
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/backend && npm test -- notifications.service`
Expected: FAIL — `NotificationsService` constructor doesn't accept a `push` argument, `handleAbsenceMarked` doesn't exist.

- [ ] **Step 4: Implement**

Replace `apps/backend/src/modules/notifications/notifications.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';
import { ABSENCE_MARKED_EVENT, AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';
import { ATTENDANCE_RECORDED_EVENT, AttendanceRecordedEvent } from '@/modules/attendance/events/attendance-recorded.event';
import { PushProvider } from '@/modules/notifications/providers/push-provider';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
    private readonly push: PushProvider,
  ) {}

  /**
   * `EventEmitter2.emit()` (utilisé par AttendanceService) ne bloque pas sur
   * les listeners async : ce handler tourne après coup, sans ralentir la
   * confirmation du pointage (exigence <2s du cahier des charges).
   */
  @OnEvent(ATTENDANCE_RECORDED_EVENT)
  async handleAttendanceRecorded(event: AttendanceRecordedEvent): Promise<void> {
    const student = await this.findStudentWithSchool(event.studentId);
    if (!student) return;

    const time = event.recordedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const lateSuffix = event.isLate ? ' (en retard)' : '';
    const message = `Bonjour, votre enfant ${this.fullName(student)} est bien arrivé à l'école ${student.school.name} à ${time}${lateSuffix}.`;

    await this.notifyParents(student.id, message, 'Arrivée');
  }

  /**
   * Déclenché par `AbsencesService.detectAbsences` — voir §3.5 du cahier des
   * charges (notification d'absence sans délai au parent/tuteur).
   */
  @OnEvent(ABSENCE_MARKED_EVENT)
  async handleAbsenceMarked(event: AbsenceMarkedEvent): Promise<void> {
    const student = await this.findStudentWithSchool(event.studentId);
    if (!student) return;

    const message = `Bonjour, votre enfant ${this.fullName(student)} est absent aujourd'hui à l'école ${student.school.name}. Contactez l'école si besoin.`;

    await this.notifyParents(student.id, message, 'Absence');
  }

  private async findStudentWithSchool(studentId: string) {
    return this.prisma.student.findUnique({ where: { id: studentId }, include: { school: true } });
  }

  private fullName(student: { lastName: string; middleName: string | null; firstName: string }): string {
    return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
  }

  /**
   * SMS : respecte le canal choisi par fiche parent (`ParentGuardian.notificationChannel`).
   * Push : envoyé à tout compte PARENT lié à l'élève disposant d'un
   * `expoPushToken` — le modèle de données ne relie pas un compte PARENT à
   * une fiche `ParentGuardian` précise (le lien se fait par numéro de
   * téléphone au provisioning, cf. `students.service.ts`), donc le canal
   * "push" ne peut pas encore être filtré fiche par fiche comme le SMS ;
   * c'est une simplification connue, pas un oubli.
   */
  private async notifyParents(studentId: string, message: string, pushTitle: string): Promise<void> {
    const [parentGuardians, parentUsers] = await Promise.all([
      this.prisma.parentGuardian.findMany({ where: { studentId } }),
      this.prisma.user.findMany({ where: { role: 'PARENT', children: { some: { id: studentId } } } }),
    ]);

    const smsRecipients = parentGuardians.filter(
      (parent) =>
        parent.notificationChannel === NotificationChannel.SMS || parent.notificationChannel === NotificationChannel.BOTH,
    );
    const pushRecipients = parentUsers.filter((user): user is typeof user & { expoPushToken: string } => !!user.expoPushToken);

    await Promise.all([
      ...smsRecipients.map((parent) =>
        this.sms.send(parent.phoneNumber, message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi SMS pour le parent ${parent.id}`, error);
        }),
      ),
      ...pushRecipients.map((user) =>
        this.push.send(user.expoPushToken, pushTitle, message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi push pour le compte ${user.id}`, error);
        }),
      ),
    ]);
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd apps/backend && npm test -- notifications.service`
Expected: PASS, 3 tests.

- [ ] **Step 6: Register the provider**

Replace `apps/backend/src/modules/notifications/notifications.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ExpoPushProvider } from '@/modules/notifications/providers/push-provider.expo';
import { PushProvider } from '@/modules/notifications/providers/push-provider';
import { MockSmsProvider } from '@/modules/notifications/providers/sms-provider.mock';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';

@Module({
  providers: [
    NotificationsService,
    { provide: SmsProvider, useClass: MockSmsProvider },
    { provide: PushProvider, useClass: ExpoPushProvider },
  ],
})
export class NotificationsModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/notifications
git commit -m "feat(backend): send push notifications for arrivals and absences"
```

---

### Task 9: `ClassesModule` — CRUD + teacher assignment

**Files:**
- Create: `apps/backend/src/modules/classes/dto/create-class.dto.ts`
- Create: `apps/backend/src/modules/classes/dto/update-class.dto.ts`
- Create: `apps/backend/src/modules/classes/classes.service.ts`
- Create: `apps/backend/src/modules/classes/classes.service.spec.ts`
- Create: `apps/backend/src/modules/classes/classes.controller.ts`
- Create: `apps/backend/src/modules/classes/classes.module.ts`

- [ ] **Step 1: DTOs**

Create `apps/backend/src/modules/classes/dto/create-class.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  promotion!: string;
}
```

Create `apps/backend/src/modules/classes/dto/update-class.dto.ts`:

```ts
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  promotion?: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `apps/backend/src/modules/classes/classes.service.spec.ts`:

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ClassesService } from '@/modules/classes/classes.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    schoolClass: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    ...overrides,
  } as any;
}

describe('ClassesService', () => {
  it('creates a class scoped to the current school', async () => {
    const prisma = buildPrisma({ schoolClass: { create: jest.fn().mockResolvedValue({ id: 'class-1' }) } });
    const service = new ClassesService(prisma);

    await service.create({ name: '6e A', promotion: '2026' }, 'school-1');

    expect(prisma.schoolClass.create).toHaveBeenCalledWith({
      data: { name: '6e A', promotion: '2026', schoolId: 'school-1' },
    });
  });

  it('rejects updating a class that belongs to another school', async () => {
    const prisma = buildPrisma({ schoolClass: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new ClassesService(prisma);

    await expect(service.update('class-1', { name: 'x' }, 'school-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects assigning a user that is not ENSEIGNANT/SURVEILLANT of this school', async () => {
    const prisma = buildPrisma({
      schoolClass: { findFirst: jest.fn().mockResolvedValue({ id: 'class-1' }) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new ClassesService(prisma);

    await expect(service.assignTeacher('class-1', 'user-1', 'school-1')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/backend && npm test -- classes.service`
Expected: FAIL — `Cannot find module '@/modules/classes/classes.service'`

- [ ] **Step 4: Implement**

Create `apps/backend/src/modules/classes/classes.service.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import type { CreateClassDto } from '@/modules/classes/dto/create-class.dto';
import type { UpdateClassDto } from '@/modules/classes/dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.schoolClass.findMany({
      where: { schoolId, deletedAt: null },
      include: { assignedTeachers: true },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateClassDto, schoolId: string) {
    return this.prisma.schoolClass.create({ data: { name: dto.name, promotion: dto.promotion, schoolId } });
  }

  async update(classId: string, dto: UpdateClassDto, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    return this.prisma.schoolClass.update({ where: { id: classId }, data: dto });
  }

  async remove(classId: string, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    return this.prisma.schoolClass.update({ where: { id: classId }, data: { deletedAt: new Date() } });
  }

  async assignTeacher(classId: string, userId: string, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    const teacher = await this.prisma.user.findFirst({
      where: { id: userId, schoolId, role: { in: ['ENSEIGNANT', 'SURVEILLANT'] } },
    });
    if (!teacher) throw new NotFoundException('Enseignant/surveillant introuvable dans cette école');
    return this.prisma.schoolClass.update({
      where: { id: classId },
      data: { assignedTeachers: { connect: { id: userId } } },
    });
  }

  async unassignTeacher(classId: string, userId: string, schoolId: string) {
    await this.assertBelongsToSchool(classId, schoolId);
    return this.prisma.schoolClass.update({
      where: { id: classId },
      data: { assignedTeachers: { disconnect: { id: userId } } },
    });
  }

  private async assertBelongsToSchool(classId: string, schoolId: string) {
    const schoolClass = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId, deletedAt: null } });
    if (!schoolClass) throw new ForbiddenException("Classe hors du périmètre de l'école");
    return schoolClass;
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd apps/backend && npm test -- classes.service`
Expected: PASS, 3 tests.

- [ ] **Step 6: Controller**

Create `apps/backend/src/modules/classes/classes.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { ClassesService } from '@/modules/classes/classes.service';
import { CreateClassDto } from '@/modules/classes/dto/create-class.dto';
import { UpdateClassDto } from '@/modules/classes/dto/update-class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Roles('DIRECTION')
  list() {
    return this.classesService.list(this.tenant.schoolId);
  }

  @Post()
  @Roles('DIRECTION')
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto, this.tenant.schoolId);
  }

  @Patch(':classId')
  @Roles('DIRECTION')
  update(@Param('classId') classId: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(classId, dto, this.tenant.schoolId);
  }

  @Delete(':classId')
  @Roles('DIRECTION')
  remove(@Param('classId') classId: string) {
    return this.classesService.remove(classId, this.tenant.schoolId);
  }

  @Post(':classId/teachers/:userId')
  @Roles('DIRECTION')
  assignTeacher(@Param('classId') classId: string, @Param('userId') userId: string) {
    return this.classesService.assignTeacher(classId, userId, this.tenant.schoolId);
  }

  @Delete(':classId/teachers/:userId')
  @Roles('DIRECTION')
  unassignTeacher(@Param('classId') classId: string, @Param('userId') userId: string) {
    return this.classesService.unassignTeacher(classId, userId, this.tenant.schoolId);
  }
}
```

- [ ] **Step 7: Module**

Create `apps/backend/src/modules/classes/classes.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { ClassesController } from '@/modules/classes/classes.controller';
import { ClassesService } from '@/modules/classes/classes.service';

@Module({
  providers: [ClassesService],
  controllers: [ClassesController],
  exports: [ClassesService],
})
export class ClassesModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/classes
git commit -m "feat(backend): add classes CRUD and teacher assignment"
```

---

### Task 10: `StaffModule` — provision/list/disable teacher & surveillant accounts

**Files:**
- Create: `apps/backend/src/modules/staff/dto/create-staff.dto.ts`
- Create: `apps/backend/src/modules/staff/staff.service.ts`
- Create: `apps/backend/src/modules/staff/staff.service.spec.ts`
- Create: `apps/backend/src/modules/staff/staff.controller.ts`
- Create: `apps/backend/src/modules/staff/staff.module.ts`

- [ ] **Step 1: DTO**

Create `apps/backend/src/modules/staff/dto/create-staff.dto.ts`:

```ts
import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsIn(['ENSEIGNANT', 'SURVEILLANT'])
  role!: 'ENSEIGNANT' | 'SURVEILLANT';

  // Utilisé uniquement pour générer un identifiant lisible (prénom.nom) —
  // il n'existe pas de champ prénom/nom sur `User`, voir note du spec §5.1.
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `apps/backend/src/modules/staff/staff.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';

import { StaffService } from '@/modules/staff/staff.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    ...overrides,
  } as any;
}

describe('StaffService.create', () => {
  it('provisions an ENSEIGNANT account with a generated username and password', async () => {
    const prisma = buildPrisma();
    const service = new StaffService(prisma);

    const result = await service.create({ role: 'ENSEIGNANT', firstName: 'Jean', lastName: 'Dupont' }, 'school-1');

    expect(result.username).toBe('jean.dupont');
    expect(result.password).toHaveLength(8);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'jean.dupont', role: 'ENSEIGNANT', schoolId: 'school-1' }),
    });
  });
});

describe('StaffService.disable', () => {
  it('sets disabledAt on a staff account of the current school', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), update: jest.fn() } });
    const service = new StaffService(prisma);

    await service.disable('user-1', 'school-1');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { disabledAt: expect.any(Date) } });
  });

  it('rejects disabling an account outside the current school', async () => {
    const prisma = buildPrisma({ user: { findFirst: jest.fn().mockResolvedValue(null) } });
    const service = new StaffService(prisma);

    await expect(service.disable('user-1', 'school-1')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/backend && npm test -- staff.service`
Expected: FAIL — `Cannot find module '@/modules/staff/staff.service'`

- [ ] **Step 4: Implement**

Create `apps/backend/src/modules/staff/staff.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { generatePassword, generateUniqueUsername } from '@/common/accounts/generate-credentials';
import { PrismaService } from '@/database/prisma.service';
import type { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';

export type ProvisionedStaffAccount = {
  username: string;
  password: string;
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // Retourne le mot de passe en clair une seule fois — même contrat que
  // StudentsService.provisionAccount (voir spec §4.3).
  async create(dto: CreateStaffDto, schoolId: string): Promise<ProvisionedStaffAccount> {
    const username = await generateUniqueUsername(this.prisma, dto.firstName, dto.lastName);
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({ data: { username, passwordHash, role: dto.role, schoolId } });

    return { username, password };
  }

  list(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId, role: { in: ['ENSEIGNANT', 'SURVEILLANT'] } },
      include: { assignedClasses: true },
      orderBy: { username: 'asc' },
    });
  }

  async disable(userId: string, schoolId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, schoolId } });
    if (!user) throw new NotFoundException('Compte introuvable');
    return this.prisma.user.update({ where: { id: userId }, data: { disabledAt: new Date() } });
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd apps/backend && npm test -- staff.service`
Expected: PASS, 3 tests.

- [ ] **Step 6: Controller**

Create `apps/backend/src/modules/staff/staff.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { CreateStaffDto } from '@/modules/staff/dto/create-staff.dto';
import { StaffService } from '@/modules/staff/staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Roles('DIRECTION')
  list() {
    return this.staffService.list(this.tenant.schoolId);
  }

  // Retourne le mot de passe en clair une seule fois : à noter/transmettre
  // immédiatement, non récupérable ensuite (même UX que le provisioning élève/parent).
  @Post()
  @Roles('DIRECTION')
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto, this.tenant.schoolId);
  }

  @Patch(':userId/disable')
  @Roles('DIRECTION')
  disable(@Param('userId') userId: string) {
    return this.staffService.disable(userId, this.tenant.schoolId);
  }
}
```

- [ ] **Step 7: Module**

Create `apps/backend/src/modules/staff/staff.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { StaffController } from '@/modules/staff/staff.controller';
import { StaffService } from '@/modules/staff/staff.service';

@Module({
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/staff
git commit -m "feat(backend): add staff account provisioning, listing and deactivation"
```

---

### Task 11: `DashboardModule` — overview, trend, class comparison, alerts

**Files:**
- Create: `apps/backend/src/modules/dashboard/dashboard.service.ts`
- Create: `apps/backend/src/modules/dashboard/dashboard.service.spec.ts`
- Create: `apps/backend/src/modules/dashboard/dashboard.controller.ts`
- Create: `apps/backend/src/modules/dashboard/dashboard.module.ts`

- [ ] **Step 1: Write the failing tests (overview + alerts — the two with real logic)**

Create `apps/backend/src/modules/dashboard/dashboard.service.spec.ts`:

```ts
import { DashboardService } from '@/modules/dashboard/dashboard.service';

function buildPrisma(overrides: Record<string, any> = {}) {
  return {
    student: { count: jest.fn().mockResolvedValue(0) },
    attendanceRecord: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    absence: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    schoolClass: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as any;
}

describe('DashboardService.getOverview', () => {
  it('computes present/late/absent counts and a rounded rate', async () => {
    const prisma = buildPrisma({
      student: { count: jest.fn().mockResolvedValue(20) },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 's1', isLate: false },
          { studentId: 's2', isLate: true },
        ]),
      },
      absence: { count: jest.fn().mockResolvedValue(3) },
    });
    const service = new DashboardService(prisma);

    const overview = await service.getOverview('school-1');

    expect(overview).toEqual({ totalStudents: 20, presentCount: 2, lateCount: 1, absentCount: 3, rate: 10 });
  });

  it('returns a 0 rate when the school has no students (avoids division by zero)', async () => {
    const prisma = buildPrisma();
    const service = new DashboardService(prisma);

    const overview = await service.getOverview('school-1');

    expect(overview.rate).toBe(0);
  });
});

describe('DashboardService.getAlerts', () => {
  it('lists unjustified absences and students with repeated lateness (default threshold 3)', async () => {
    const prisma = buildPrisma({
      absence: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'absence-1', date: '2026-07-14', student: { id: 's1', firstName: 'Grace', lastName: 'Nkumu' } },
        ]),
      },
      attendanceRecord: {
        groupBy: jest.fn().mockResolvedValue([{ studentId: 's2', _count: { studentId: 4 } }]),
        findMany: jest.fn(),
      },
      student: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([{ id: 's2', firstName: 'Paul', lastName: 'Mbeki' }]) },
    });
    const service = new DashboardService(prisma);

    const alerts = await service.getAlerts('school-1');

    expect(alerts.unjustifiedAbsences).toHaveLength(1);
    expect(alerts.repeatedLateness).toEqual([{ studentId: 's2', firstName: 'Paul', lastName: 'Mbeki', lateCount: 4 }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npm test -- dashboard.service`
Expected: FAIL — `Cannot find module '@/modules/dashboard/dashboard.service'`

- [ ] **Step 3: Implement**

Create `apps/backend/src/modules/dashboard/dashboard.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';

const REPEATED_LATENESS_THRESHOLD = 3;
const REPEATED_LATENESS_WINDOW_DAYS = 30;

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(schoolId: string) {
    const [totalStudents, records, absentCount] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, deletedAt: null } }),
      this.prisma.attendanceRecord.findMany({
        where: {
          student: { schoolId },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: startOfToday() },
        },
        select: { studentId: true, isLate: true },
      }),
      this.prisma.absence.count({ where: { student: { schoolId }, date: this.todayKey() } }),
    ]);

    const presentCount = records.length;
    const lateCount = records.filter((r) => r.isLate).length;
    const rate = totalStudents === 0 ? 0 : Math.round((presentCount / totalStudents) * 100);

    return { totalStudents, presentCount, lateCount, absentCount, rate };
  }

  async getClassesComparison(schoolId: string) {
    const classes = await this.prisma.schoolClass.findMany({
      where: { schoolId, deletedAt: null },
      include: { students: { where: { deletedAt: null }, select: { id: true } } },
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        student: { schoolId },
        checkpoint: 'PORTAIL',
        direction: 'ENTREE',
        recordedAt: { gte: startOfToday() },
      },
      select: { studentId: true },
    });
    const presentIds = new Set(records.map((r) => r.studentId));

    return classes.map((schoolClass) => {
      const total = schoolClass.students.length;
      const present = schoolClass.students.filter((s) => presentIds.has(s.id)).length;
      return {
        schoolClassId: schoolClass.id,
        name: schoolClass.name,
        totalStudents: total,
        presentCount: present,
        rate: total === 0 ? 0 : Math.round((present / total) * 100),
      };
    });
  }

  async getAlerts(schoolId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - REPEATED_LATENESS_WINDOW_DAYS);

    const [unjustifiedAbsences, lateGroups] = await Promise.all([
      this.prisma.absence.findMany({
        where: { student: { schoolId }, justified: false },
        include: { student: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['studentId'],
        where: { isLate: true, recordedAt: { gte: cutoff }, student: { schoolId } },
        _count: { studentId: true },
        having: { studentId: { _count: { gte: REPEATED_LATENESS_THRESHOLD } } },
      }),
    ]);

    const lateStudentIds = lateGroups.map((g) => g.studentId);
    const lateStudents = lateStudentIds.length
      ? await this.prisma.student.findMany({ where: { id: { in: lateStudentIds } } })
      : [];
    const lateStudentById = new Map(lateStudents.map((s) => [s.id, s]));

    return {
      unjustifiedAbsences: unjustifiedAbsences.map((absence) => ({
        absenceId: absence.id,
        date: absence.date,
        studentId: absence.student.id,
        firstName: absence.student.firstName,
        lastName: absence.student.lastName,
      })),
      repeatedLateness: lateGroups.map((group) => {
        const student = lateStudentById.get(group.studentId);
        return {
          studentId: group.studentId,
          firstName: student?.firstName ?? '',
          lastName: student?.lastName ?? '',
          lateCount: group._count.studentId,
        };
      }),
    };
  }

  async getTrend(schoolId: string, period: 'week' | 'month') {
    const days = period === 'week' ? 7 : 30;
    const totalStudents = await this.prisma.student.count({ where: { schoolId, deletedAt: null } });

    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const presentCount = await this.prisma.attendanceRecord.count({
        where: {
          student: { schoolId },
          checkpoint: 'PORTAIL',
          direction: 'ENTREE',
          recordedAt: { gte: day, lt: nextDay },
        },
      });

      points.push({
        date: this.todayKey(day),
        rate: totalStudents === 0 ? 0 : Math.round((presentCount / totalStudents) * 100),
      });
    }
    return points;
  }

  private todayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/backend && npm test -- dashboard.service`
Expected: PASS, 3 tests.

- [ ] **Step 5: Controller**

Create `apps/backend/src/modules/dashboard/dashboard.controller.ts`:

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { DashboardService } from '@/modules/dashboard/dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTION')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('overview')
  overview() {
    return this.dashboardService.getOverview(this.tenant.schoolId);
  }

  @Get('classes-comparison')
  classesComparison() {
    return this.dashboardService.getClassesComparison(this.tenant.schoolId);
  }

  @Get('alerts')
  alerts() {
    return this.dashboardService.getAlerts(this.tenant.schoolId);
  }

  @Get('trend')
  trend(@Query('period') period: 'week' | 'month' = 'week') {
    return this.dashboardService.getTrend(this.tenant.schoolId, period === 'month' ? 'month' : 'week');
  }
}
```

(Note: `@Roles('DIRECTION')` at controller level — unlike other controllers in this codebase which repeat `@Roles` per method, all four routes here share the exact same rule, so it is set once at the class level; `RolesGuard` already supports this via `getAllAndOverride([handler, class])`.)

- [ ] **Step 6: Module**

Create `apps/backend/src/modules/dashboard/dashboard.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { DashboardController } from '@/modules/dashboard/dashboard.controller';
import { DashboardService } from '@/modules/dashboard/dashboard.service';

@Module({
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/dashboard
git commit -m "feat(backend): add dashboard overview, trend, class comparison and alerts endpoints"
```

---

### Task 12: Real-time `SSE` stream

**Files:**
- Modify: `apps/backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `apps/backend/src/modules/dashboard/dashboard.service.spec.ts`
- Modify: `apps/backend/src/modules/dashboard/dashboard.controller.ts`
- Modify: `apps/backend/src/modules/dashboard/dashboard.module.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/backend/src/modules/dashboard/dashboard.service.spec.ts`:

```ts
import { AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';
import { AttendanceRecordedEvent } from '@/modules/attendance/events/attendance-recorded.event';
import type { MessageEvent } from '@nestjs/common';

describe('DashboardService realtime stream', () => {
  it('emits attendance and absence events only to subscribers of the matching school', () => {
    const service = new DashboardService(buildPrisma());
    const receivedForSchool1: MessageEvent[] = [];
    const receivedForSchool2: MessageEvent[] = [];
    service.streamFor('school-1').subscribe((event) => receivedForSchool1.push(event));
    service.streamFor('school-2').subscribe((event) => receivedForSchool2.push(event));

    service.onAttendanceRecorded(new AttendanceRecordedEvent('rec-1', 'student-1', 'school-1', false, new Date()));
    service.onAbsenceMarked(new AbsenceMarkedEvent('absence-1', 'student-2', 'school-1', '2026-07-14'));

    expect(receivedForSchool1).toHaveLength(2);
    expect(receivedForSchool1[0].type).toBe('attendance.recorded');
    expect(receivedForSchool1[1].type).toBe('absence.marked');
    expect(receivedForSchool2).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/backend && npm test -- dashboard.service`
Expected: FAIL — `service.streamFor is not a function`

- [ ] **Step 3: Implement**

In `apps/backend/src/modules/dashboard/dashboard.service.ts`, add these imports at the top:

```ts
import type { MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { AbsenceMarkedEvent, ABSENCE_MARKED_EVENT } from '@/modules/absences/events/absence-marked.event';
import { AttendanceRecordedEvent, ATTENDANCE_RECORDED_EVENT } from '@/modules/attendance/events/attendance-recorded.event';
```

Add this private field and these three methods inside the `DashboardService` class (order doesn't matter, e.g. right after the constructor):

```ts
  private readonly stream$ = new Subject<{ schoolId: string; event: MessageEvent }>();

  streamFor(schoolId: string): Observable<MessageEvent> {
    return this.stream$.asObservable().pipe(
      filter((item) => item.schoolId === schoolId),
      map((item) => item.event),
    );
  }

  @OnEvent(ATTENDANCE_RECORDED_EVENT)
  onAttendanceRecorded(event: AttendanceRecordedEvent): void {
    this.stream$.next({ schoolId: event.schoolId, event: { type: 'attendance.recorded', data: event } });
  }

  @OnEvent(ABSENCE_MARKED_EVENT)
  onAbsenceMarked(event: AbsenceMarkedEvent): void {
    this.stream$.next({ schoolId: event.schoolId, event: { type: 'absence.marked', data: event } });
  }
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd apps/backend && npm test -- dashboard.service`
Expected: PASS, 4 tests.

- [ ] **Step 5: Expose the SSE route**

In `apps/backend/src/modules/dashboard/dashboard.controller.ts`, add the import `import { Sse } from '@nestjs/common';` and `import type { MessageEvent } from '@nestjs/common';` and `import type { Observable } from 'rxjs';`, then add this method inside `DashboardController`:

```ts
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.dashboardService.streamFor(this.tenant.schoolId);
  }
```

- [ ] **Step 6: Run the full backend test suite**

Run: `cd apps/backend && npm test`
Expected: all suites PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/dashboard
git commit -m "feat(backend): add SSE stream for real-time dashboard updates"
```

---

### Task 13: Wire everything into `AppModule`

**Files:**
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Register the new modules and `ScheduleModule`**

Replace `apps/backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/database/prisma.module';
import { AbsencesModule } from '@/modules/absences/absences.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CardsModule } from '@/modules/cards/cards.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SchoolsModule } from '@/modules/schools/schools.module';
import { SigningKeysModule } from '@/modules/signing-keys/signing-keys.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { SyncModule } from '@/modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    CardsModule,
    AttendanceModule,
    NotificationsModule,
    SigningKeysModule,
    SyncModule,
    AbsencesModule,
    ClassesModule,
    StaffModule,
    DashboardModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Verify the whole project compiles and boots**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: no errors.

Run: `cd apps/backend && npm run start:dev` (requires `docker compose -f ../../docker-compose.yml up -d` running first, and `npm run prisma:migrate` / `npm run seed` already applied)
Expected: Nest logs every controller's routes on startup, including `AbsencesController`, `ClassesController`, `StaffController`, `DashboardController`, no errors. Stop with Ctrl+C once confirmed.

- [ ] **Step 3: Run the full test suite one last time**

Run: `cd apps/backend && npm test`
Expected: all suites PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app.module.ts
git commit -m "feat(backend): wire absences, classes, staff and dashboard modules into AppModule"
```

---

### Task 14: Manual end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Start the stack**

Run: `docker compose -f docker-compose.yml up -d` (from repo root), then `cd apps/backend && npm run start:dev`.

- [ ] **Step 2: Log in as the seeded DIRECTION account and capture the token**

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"direction1","password":"changeme123"}'
```
Expected: JSON with `accessToken`, `role: "DIRECTION"`.

- [ ] **Step 3: Exercise the new endpoints**

Using `TOKEN` from step 2 (`-H "Authorization: Bearer $TOKEN"`):
- `GET /dashboard/overview` → `{ totalStudents, presentCount, lateCount, absentCount, rate }`
- `GET /classes` → array (empty or seeded classes)
- `POST /classes` with `{"name":"6e A","promotion":"2026"}` → created class
- `POST /staff` with `{"role":"ENSEIGNANT","firstName":"Jean","lastName":"Dupont"}` → `{ username, password }`
- `GET /staff` → includes the account just created
- `PATCH /staff/<userId>/disable` → `disabledAt` set; a subsequent login attempt with that account's credentials returns `401`
- `GET /dashboard/alerts` → `{ unjustifiedAbsences: [], repeatedLateness: [] }` (empty on a fresh seed)

- [ ] **Step 4: Verify the SSE stream manually**

```bash
curl -N -H "Authorization: Bearer $TOKEN" http://localhost:3000/dashboard/stream
```
Expected: connection stays open (no immediate close). Trigger an attendance push from the mobile app (or `POST` a sync push as the mobile app would) and confirm an `attendance.recorded` event line appears on the open curl connection.

- [ ] **Step 5: Report back**

Confirm all of the above worked, or note which step failed, before moving to the frontend plan.

---

## Plan self-review notes

- **Spec coverage:** §3 (data model) → Tasks 2, 13 (disabledAt migration). §4.1 → Tasks 5–7. §4.2 → Task 9. §4.3 → Task 10. §4.4 → Tasks 11–12. §4.5 → Task 8. §6 (security) → Tasks 4, 10. §7 (notifications) → Task 8. §8 (tests) → every task is TDD'd; frontend e2e explicitly deferred to the frontend plan.
- **No placeholders:** every step shows complete, concrete code — no "add appropriate tests" or "TBD".
- **Type consistency checked:** `AbsencesService` constructor signature (`prisma, events`) matches every place it's instantiated in tests; `NotificationsService` constructor (`prisma, sms, push`) matches its test file and `NotificationsModule` providers; `DashboardService` methods (`getOverview`, `getClassesComparison`, `getAlerts`, `getTrend`, `streamFor`, `onAttendanceRecorded`, `onAbsenceMarked`) are named consistently between the service, its two test blocks, and the controller.
