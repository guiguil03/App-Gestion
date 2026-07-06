# Architecture — Application de présence scolaire (backend + mobile)

Date: 2026-07-06
Source: `Cahier_des_charges_presence_scolaire-1.pdf` (v1.0, juillet 2026)

## Périmètre de cette architecture

Couvre : app mobile Expo (rôles Enseignant/Surveillant + Parent) et le backend API/données.
Hors périmètre : le tableau de bord web (direction/admin) — il consommera la même API REST, à concevoir séparément.

## Décisions structurantes

| Sujet | Décision |
|---|---|
| Apps mobiles | Une seule app Expo, navigation conditionnée par le rôle (pas deux apps séparées) |
| Backend | Node.js + NestJS + PostgreSQL |
| Multi-tenant | Dès la v1 (`school_id` partout), même en production mono-école |
| SMS | Adaptateur générique `SmsProvider`, implémentation branchée plus tard |
| Push | Expo Push Notifications (pas de FCM direct) |
| Hébergement | AWS (ECS Fargate, RDS Postgres, S3, ElastiCache Redis) |
| Local state mobile | WatermelonDB (SQLite) pour le domaine offline-first ; TanStack Query pour les appels API directs |

## 1. Vue d'ensemble

```
┌───────────────────────────────┐
│   App mobile Expo (RN)        │
│   Navigation selon rôle :      │
│   Enseignant/Surveillant | Parent
│                                │
│  ┌────────────┐ ┌───────────┐ │
│  │WatermelonDB│ │TanStack   │ │
│  │(SQLite,    │ │Query      │ │
│  │offline-first│ │(appels   │ │
│  │sync)       │ │directs)   │ │
│  └──────┬─────┘ └─────┬─────┘ │
└─────────┼─────────────┼───────┘
          │ /sync        │ REST (auth, upload photo,
          │ (pull/push)  │ régén. carte, rapports)
          ▼              ▼
┌──────────────────────────────────────────────────┐
│         Backend API — NestJS (Docker/ECS)         │
│  Modules : Auth, Écoles, Élèves/Parents, Cartes-QR,│
│  Sync, Présences/Absences, Notifications, Rapports,│
│  Audit                                             │
│  + Workers (BullMQ/Redis) : détection absence,     │
│    dispatch notifications, exports lourds          │
└───────┬───────────────────┬───────────────┬───────┘
        ▼                   ▼               ▼
┌───────────────┐   ┌───────────────┐  ┌─────────────────┐
│ PostgreSQL RDS │   │    AWS S3      │  │ Expo Push API,   │
│ (multi-tenant, │   │ (photos,       │  │ SmsProvider      │
│ school_id)     │   │ cartes, rapports)│ (adapter)        │
└───────────────┘   └───────────────┘  └─────────────────┘
```

**Principe clé** : WatermelonDB gère le domaine qui doit fonctionner hors-ligne et se synchroniser (élèves, classes, pointages, cartes). TanStack Query gère les appels ponctuels qui n'ont pas besoin d'offline (login, upload photo, régénération de carte, téléchargement de rapports PDF/Excel).

## 0. Structure du dépôt (monorepo)

```
App_Gestion/
├── apps/
│   ├── backend/              # API NestJS (voir §3)
│   └── mobile/               # App Expo (voir §2)
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── docker-compose.yml         # dev local : api + postgres + redis
├── .env.example
├── package.json                # workspaces npm/pnpm (racine)
└── README.md
```

Deux apps indépendantes dans un seul repo : cycles de release très différents (mobile = App Store/Play Store, backend = déploiement continu), mais un seul historique git à suivre pour un projet de cette taille. `apps/backend` et `apps/mobile` ont chacun leur propre `package.json`.

## 2. App mobile (Expo / React Native) — `apps/mobile`

### Structure de projet

```
apps/mobile/
├── app.json / app.config.ts        # config Expo
├── src/
│   ├── app/                        # expo-router
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── otp.tsx
│   │   ├── (teacher)/              # stack Enseignant/Surveillant
│   │   │   ├── scan.tsx
│   │   │   ├── class-roster.tsx
│   │   │   └── attendance-history.tsx
│   │   ├── (parent)/               # stack Parent
│   │   │   ├── children.tsx
│   │   │   ├── notifications.tsx
│   │   │   └── absence-justification.tsx
│   │   └── _layout.tsx             # redirection selon le rôle (claim JWT)
│   ├── features/
│   │   ├── attendance/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── qr-scanner.tsx
│   │   ├── students/                # roster, fiche élève
│   │   ├── absences/                # justification d'absence
│   │   ├── notifications/           # centre de notifications in-app
│   │   ├── reports/                  # historique/rapports côté parent
│   │   └── auth/
│   ├── db/                          # WatermelonDB
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   ├── models/
│   │   │   ├── School.ts
│   │   │   ├── SchoolClass.ts
│   │   │   ├── Student.ts
│   │   │   ├── ParentGuardian.ts
│   │   │   ├── StudentCard.ts
│   │   │   ├── AttendanceRecord.ts
│   │   │   ├── Absence.ts
│   │   │   └── RevokedCard.ts
│   │   ├── sync.ts                  # adaptateur pull/push vers /sync
│   │   └── database.ts              # instance WatermelonDB (adapter SQLite)
│   ├── api/                          # TanStack Query (appels directs, hors sync)
│   │   ├── client.ts
│   │   └── hooks/
│   │       ├── useLogin.ts
│   │       ├── useUploadPhoto.ts
│   │       ├── useRegenerateCard.ts
│   │       └── useReports.ts
│   ├── services/
│   │   ├── qrVerify.ts              # vérification offline de la signature Ed25519
│   │   ├── secureStorage.ts         # Expo SecureStore (tokens)
│   │   ├── pushNotifications.ts     # enregistrement Expo Push
│   │   └── netInfoSyncTrigger.ts    # déclenche la sync à la reconnexion réseau
│   ├── navigation/
│   │   └── roleGuard.ts
│   ├── components/                   # design system partagé
│   ├── theme/
│   └── types/
├── assets/
├── package.json
└── tsconfig.json
```

### Navigation par rôle

Après login, le rôle (claim du JWT) détermine le stack affiché : `TeacherStack` (scan QR, roster de classe, historique de pointage) ou `ParentStack` (liste des enfants, notifications, justification d'absence). Direction/Admin restent principalement sur le dashboard web ; s'ils ont besoin d'un accès mobile plus tard, un `DirectionStack` en lecture seule peut être ajouté sans changer l'architecture.

### Synchronisation offline-first (WatermelonDB)

- Modèles locaux : `School`, `SchoolClass`, `Student`, `ParentGuardian`, `StudentCard` (cardId, signature, revoked), `AttendanceRecord` (studentId, type ENTREE/SORTIE, checkpoint PORTAIL/CLASSE, timestamp), `AbsenceJustification`.
- Protocole standard WatermelonDB : `pullChanges(lastPulledAt)` renvoie `{created, updated, deleted}` filtré par école/classes accessibles au user (un parent ne reçoit que les données de ses enfants) ; `pushChanges` envoie les `AttendanceRecord` créés localement + justificatifs d'absence.
- Les pointages créés sur l'appareil sont **authoritatifs** (le serveur les persiste tels quels) — pas de conflit de merge à gérer pour les créations. Les mises à jour rares suivent le last-write-wins par défaut de WatermelonDB (`updated_at`).
- Déclencheurs de sync : retour au premier plan de l'app, après un lot de pointages, tâche périodique en arrière-plan (Expo BackgroundFetch), et reconnexion réseau (listener NetInfo).

### QR code — génération et vérification offline non falsifiable

- À la génération d'une carte, le backend crée `cardId` (UUID v4) et signe `{cardId, studentId, schoolId, issuedAt}` avec une clé privée **Ed25519** détenue uniquement côté serveur. Le QR encode le payload + la signature.
- L'app embarque/synchronise la **clé publique** de l'école et vérifie la signature **localement, hors-ligne** (librairie pure JS, ex. `@noble/ed25519`) — prouve que la carte a bien été émise par le backend, sans contact réseau au moment du scan.
- Révocation (perte/vol) : la table `revoked_cards` (juste les `cardId` révoqués) est synchronisée comme le reste du domaine WatermelonDB et vérifiée localement avant d'accepter un scan. Limite connue et acceptée : un appareil resté hors-ligne très longtemps peut accepter un scan sur une carte révoquée jusqu'à sa prochaine sync — acceptable vu la fréquence de sync attendue.

## 3. Backend (NestJS)

### Modules

- **AuthModule** — login (identifiant/mot de passe), JWT access (courte durée) + refresh (rotation), étape OTP SMS optionnelle pour Direction/Admin, guards de rôle (ADMIN, DIRECTION, ENSEIGNANT, SURVEILLANT, PARENT) et guard de tenant (extrait `school_id` du JWT).
- **SchoolsModule** — écoles, classes, promotions (CRUD réservé Admin/Direction).
- **StudentsModule** — fiches élèves/parents, validation du numéro de téléphone (format + opérateur reconnu) avant enregistrement.
- **CardsModule** — génération de carte (cardId + signature Ed25519), export PDF (gabarit imprimable format carte bancaire), désactivation + régénération en cas de perte/vol.
- **SyncModule** — endpoint `POST /sync` compatible protocole WatermelonDB, scope automatique par tenant + rôle (un parent ne peut pull que les données de ses enfants).
- **AttendanceModule** — réception des pointages via sync push, détection de retard (comparaison à l'heure limite de l'école), émet un événement consommé par NotificationsModule.
- **AbsencesModule** — job planifié (BullMQ repeatable, par école selon `heureReference` + `tolerance` paramétrables) qui croise le roster attendu vs les pointages reçus et marque absent ; endpoint de justification a posteriori.
- **NotificationsModule** — sélection de canal par fiche parent (PUSH / SMS / les deux), `PushProvider` (Expo Push API), `SmsProvider` (interface, implémentation branchée plus tard selon l'opérateur retenu).
- **ReportsModule** — export PDF/Excel en job asynchrone (évite de bloquer la requête), upload S3, retourne une URL présignée de téléchargement.
- **AuditModule** — interceptor qui journalise les accès aux données personnelles (qui a consulté quelle fiche élève, quand) dans `audit_log`.

### Structure de projet — `apps/backend`

```
apps/backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/            # @CurrentUser(), @Roles()
│   │   ├── guards/                 # JwtAuthGuard, RolesGuard, TenantGuard
│   │   ├── interceptors/           # AuditInterceptor
│   │   ├── filters/                # HttpExceptionFilter
│   │   └── tenant/                 # TenantContext (request-scoped)
│   ├── config/                     # env config (database, jwt, s3, sms, redis)
│   ├── database/
│   │   ├── migrations/
│   │   ├── entities/               # School, Student, Parent, StudentCard, AttendanceRecord, Absence, User, AuditLog, RevokedCard...
│   │   └── seeds/
│   ├── jobs/
│   │   └── queue.module.ts         # config BullMQ / connexion Redis
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── strategies/         # jwt.strategy.ts, local.strategy.ts
│       │   └── dto/
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.service.ts
│       │   └── dto/
│       ├── schools/
│       │   ├── schools.module.ts
│       │   ├── schools.controller.ts
│       │   ├── schools.service.ts
│       │   ├── school-classes.service.ts
│       │   └── dto/
│       ├── students/
│       │   ├── students.module.ts
│       │   ├── students.controller.ts
│       │   ├── students.service.ts
│       │   ├── parents.service.ts
│       │   ├── phone-validation.service.ts
│       │   └── dto/
│       ├── cards/
│       │   ├── cards.module.ts
│       │   ├── cards.controller.ts
│       │   ├── cards.service.ts
│       │   ├── card-signing.service.ts     # Ed25519 sign/verify
│       │   ├── card-pdf.service.ts
│       │   └── dto/
│       ├── sync/
│       │   ├── sync.module.ts
│       │   ├── sync.controller.ts
│       │   ├── sync.service.ts
│       │   └── dto/
│       ├── attendance/
│       │   ├── attendance.module.ts
│       │   ├── attendance.service.ts
│       │   ├── late-detection.service.ts
│       │   └── events/
│       │       └── attendance-recorded.event.ts
│       ├── absences/
│       │   ├── absences.module.ts
│       │   ├── absences.controller.ts
│       │   ├── absences.service.ts
│       │   ├── absence-detection.processor.ts   # worker BullMQ
│       │   └── dto/
│       ├── notifications/
│       │   ├── notifications.module.ts
│       │   ├── notifications.service.ts
│       │   ├── notifications.processor.ts       # worker BullMQ
│       │   └── providers/
│       │       ├── push-provider.ts              # Expo Push
│       │       ├── sms-provider.interface.ts
│       │       └── sms-provider.mock.ts           # impl réelle branchée plus tard
│       ├── reports/
│       │   ├── reports.module.ts
│       │   ├── reports.controller.ts
│       │   ├── reports.service.ts
│       │   ├── reports.processor.ts               # worker BullMQ
│       │   ├── report-pdf.generator.ts
│       │   └── report-excel.generator.ts
│       ├── storage/
│       │   ├── storage.module.ts
│       │   └── s3.service.ts                       # URLs présignées
│       └── audit/
│           ├── audit.module.ts
│           └── audit.service.ts
├── test/                                            # tests e2e
├── Dockerfile
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### Multi-tenant

Base Postgres unique, `school_id` sur toutes les tables du domaine (sauf `schools` elle-même et les comptes Admin globaux). Un `TenantContext` request-scoped (rempli depuis le claim JWT après l'AuthGuard) est propagé aux repositories ; une base de repository commune force le filtre `school_id` automatiquement pour éviter les oublis. En seconde ligne de défense : policies Postgres Row-Level Security liées à une variable de session (`SET app.current_school_id`) positionnée par requête.

### Tables principales (aperçu)

`schools`, `school_classes`, `students`, `parents`, `student_parent_link`, `student_cards`, `attendance_records`, `absences`, `absence_justifications`, `users`, `notification_preferences`, `audit_log`, `revoked_cards`.

## 4. Notifications & jobs asynchrones

- Redis (ElastiCache) + BullMQ pour découpler le chemin critique (pointage < 2s) du dispatch des notifications.
- Files : `notifications` (push/SMS avec retry/backoff — la passerelle SMS locale peut être instable), `absence-detection` (job répétable par école), `reports-export` (génération PDF/Excel lourde hors du chemin de requête).
- Flux d'arrivée : `AttendanceModule` persiste le pointage → émet un événement → `NotificationsModule` enqueue un job selon la préférence de canal du parent → le worker appelle `PushProvider` et/ou `SmsProvider` → statut de livraison journalisé (retry + audit).
- Interface `SmsProvider` : `send(to, message): Promise<{status, providerId}>` — permet de brancher Airtel/MTN Congo ou un agrégateur (Twilio/Vonage) sans toucher au reste du code.
- Détection d'absence : job planifié par école selon ses paramètres (`heureReference`, `tolerance`), configuré dynamiquement (pas de valeur codée en dur) puisque chaque établissement peut avoir un horaire différent.

## 5. Stockage, sécurité, auth, déploiement

- **S3** : préfixes privés `photos/{schoolId}/{studentId}.jpg`, `cards/{schoolId}/{cardId}.pdf`, `reports/{schoolId}/{reportId}.pdf|xlsx`. Accès via URLs présignées à courte durée de vie — l'app mobile upload directement les photos vers S3 (pas de proxy binaire par l'API), ce qui réduit la consommation de données (exigence non fonctionnelle du cahier des charges).
- **Chiffrement** : RDS chiffré au repos, S3 SSE, TLS partout (ALB termine le TLS).
- **Auth** : JWT access (~15 min) + refresh token (rotation), stockage dans Expo SecureStore ; étape OTP SMS optionnelle pour rôles sensibles (conforme section 3.8 du cahier des charges).
- **RBAC** : rôle + `school_id` dans le JWT ; guards NestJS par endpoint.
- **Déploiement AWS** : ECS Fargate pour l'API (même image Docker qu'en local), ALB (TLS), RDS PostgreSQL, ElastiCache Redis (BullMQ), S3, CloudWatch (logs/métriques). Docker Compose reste l'environnement de dev local (API + Postgres + Redis), miroir de la config ECS.

## Comment ça répond aux exigences non fonctionnelles clés

- **Performance (<2s par pointage)** : l'API persiste le pointage et enqueue le job de notification de façon asynchrone — elle ne bloque jamais sur l'envoi push/SMS.
- **Hors ligne** : WatermelonDB + vérification de signature QR 100% locale couvrent le scénario de zones à connectivité instable.
- **Sécurité** : QR non falsifiable par signature asymétrique, chiffrement au repos/en transit, journalisation des accès (AuditModule).
- **Évolutivité multi-écoles** : multi-tenant dès la v1, aucune migration de schéma nécessaire pour ajouter une 2e école.
