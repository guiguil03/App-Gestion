# Dashboard Direction (Next.js) — Design

Date : 2026-07-14
Statut : en attente de revue utilisateur

## 1. Contexte et objectif

Le cahier des charges (`docs/Cahier_des_charges_presence_scolaire-1.pdf`) exige un
tableau de bord direction accessible depuis un navigateur web (§3.7, §4
"Compatibilité", §5 livrables), avec :

- une vue d'ensemble en temps réel du taux de présence (jour, par classe, école) ;
- des alertes sur les absences non justifiées et les retards répétés ;
- des statistiques et tendances (hebdo/mensuel, comparaison entre classes) ;
- la gestion des classes et des promotions ;
- la gestion des comptes utilisateurs (enseignants, surveillants) et de leurs
  droits d'accès.

Aucune de ces briques n'existe aujourd'hui : ni endpoints backend (stats,
alertes, CRUD classes/staff), ni marquage automatique des absences (seul le
retard est calculé au pointage), ni app web. Ce spec couvre les trois à la
fois : extensions `apps/backend` (NestJS) + nouvelle app `apps/dashboard`
(Next.js), reliées entre elles.

Le design visuel et les mécanismes d'auth sont calqués sur un projet Next.js
de référence (`../frontend` à côté de ce repo, projet "presence-collab-dashboard"
pour un autre backend) : sidebar zinc/emerald, cartes KPI, proxy Next.js +
cookies httpOnly. Seule l'UI et le pattern d'auth sont repris — le backend
ciblé reste `apps/backend` de ce repo.

## 2. Découverte : travail déjà commencé

`apps/backend/prisma/schema.prisma` contient des modifications non commitées
au moment de ce spec :
- un modèle `Absence` (`studentId`, `date`, `justified`, `justificationReason`,
  contrainte unique `[studentId, date]`) ;
- un champ `User.expoPushToken`.

Aucun code backend ne les utilise encore (pas de migration générée, pas de
service). Ce spec construit sur cette base plutôt que d'en proposer une
différente.

## 3. Modèle de données

En plus de l'existant (`Absence`, `User.expoPushToken`) :

- `User.disabledAt DateTime?` — désactivation soft d'un compte staff (même
  pattern que `deletedAt` sur `School`/`SchoolClass`/`Student`). Un compte
  désactivé est rejeté par `JwtAuthGuard` à chaque requête (pas seulement au
  login).

Aucun autre changement de schéma : `SchoolClass` a déjà tout pour les classes
et leur assignation (`assignedTeachers` / relation `class_assignments`) ;
`AttendanceRecord.isLate` suffit pour détecter les retards répétés par
requête d'agrégation (pas de table dédiée).

Une migration Prisma est nécessaire pour appliquer `Absence` + `expoPushToken`
(déjà dans le schema, jamais migrés) + `User.disabledAt`.

## 4. Backend — nouveaux modules NestJS

Tous les endpoints sont protégés par `JwtAuthGuard` + `RolesGuard` +
`TenantContext` (scoping par école), comme l'existant. Rôle `DIRECTION` sauf
mention contraire.

### 4.1 `AbsencesModule`

- Job planifié (`@nestjs/schedule`, `@Cron`) qui tourne peu après
  `School.attendanceReferenceTime + attendanceToleranceMinutes` (vérification
  par école, car chaque école a ses propres horaires). Pour chaque élève actif
  sans `AttendanceRecord` de type `PORTAIL`/`ENTREE` sur la date du jour, crée
  une ligne `Absence` (idempotent grâce à `@@unique([studentId, date])` —
  re-exécution sans effet de bord).
- Émission d'un événement (`EventEmitter2`, même mécanisme que
  `ATTENDANCE_RECORDED_EVENT`) consommé par `NotificationsService` (notif
  parent) et par le flux SSE du dashboard.
- `PATCH /absences/:id/justify` — `DIRECTION` sur toute absence de son école,
  `PARENT` uniquement sur les absences de ses propres enfants (même contrôle
  403 que le reste du module `students`).
- `GET /absences` — liste filtrable (classe, période, statut justifié).

### 4.2 `ClassesModule`

- `GET/POST /classes`, `PATCH/DELETE /classes/:id` (soft delete via
  `deletedAt`, déjà présent au schema).
- `POST /classes/:id/teachers/:userId` / `DELETE /classes/:id/teachers/:userId`
  — assignation/retrait enseignant↔classe (relation `class_assignments`
  existante, jusqu'ici alimentée seulement via seed).

### 4.3 `StaffModule`

- `POST /staff` — provisionner un compte `ENSEIGNANT` ou `SURVEILLANT`, même
  pattern que le provisioning `ELEVE`/`PARENT` déjà en place dans
  `students.service.ts` (mot de passe généré aléatoirement, retourné une
  seule fois dans la réponse, jamais récupérable ensuite).
- `GET /staff` — liste du personnel de l'école (rôle, classes assignées,
  statut actif/désactivé).
- `PATCH /staff/:id/disable` — désactivation soft (`disabledAt`).

### 4.4 `DashboardModule`

- `GET /dashboard/overview` — présents/retards/absents du jour, école entière
  + ventilé par classe.
- `GET /dashboard/trend?period=week|month` — série temporelle du taux de
  présence.
- `GET /dashboard/classes-comparison` — taux de présence par classe sur une
  période.
- `GET /dashboard/alerts` — absences non justifiées + élèves en retard répété
  (seuil configurable, défaut : ≥3 retards sur 30 jours glissants).
- `SSE GET /dashboard/stream` — endpoint `@Sse()` NestJS natif, branché sur
  `EventEmitter2`, pousse les événements `attendance.recorded` et
  `absence.marked` pour rafraîchir la vue d'ensemble sans polling.

### 4.5 `NotificationsService` (extension)

- Ajout d'un envoi push (Expo Push API, appel HTTP direct — pas de nouvelle
  dépendance lourde) via `User.expoPushToken`, en plus du SMS existant. Même
  pattern `abstract class` que `SmsProvider` pour rester mockable en test.
- Nouveau template de message pour l'absence (§3.4/3.5 du cahier des
  charges) : *« Bonjour, votre enfant [Nom] est absent aujourd'hui à [École].
  Contactez l'école si besoin. »*

## 5. Frontend `apps/dashboard` (Next.js)

Nouvelle app indépendante (comme `apps/backend` et `apps/mobile` — pas de
monorepo tooling partagé), stack : Next.js 14 App Router, TypeScript strict,
Tailwind CSS (classes utilitaires directes, pas de shadcn/ui — le projet de
référence n'en a pas non plus), React Query v5, React Hook Form + Zod, Axios,
Lucide React, Recharts.

### 5.1 Design system (repris à l'identique du projet de référence)

- Sidebar fixe à gauche (`w-60`, fond blanc, `border-zinc-100`), logo carré
  dégradé emerald→teal, badge de rôle.
- Nav groupée par sections (titres discrets majuscules `text-zinc-400`),
  lien actif = fond `zinc-900`/texte blanc, icônes Lucide.
- Cartes KPI : fond blanc, `rounded-xl`, `border-slate-200`, `shadow-sm`,
  icône dans un badge coloré + valeur en gros.
- Palette neutre zinc/slate + accent emerald/teal ; une couleur par type de
  KPI (vert = présents, orange = retards, rouge = absents).
- Pied de sidebar : avatar dégradé + bouton déconnexion. Note : `User` n'a
  pas de prénom/nom (seulement `username`) contrairement au projet de
  référence — l'avatar affiche les 2 premières lettres du `username`, pas des
  initiales prénom/nom.

### 5.2 Auth (pattern repris du projet de référence, adapté à `apps/backend`)

- `src/app/api/auth/login/route.ts` : proxy vers `POST /auth/login` du
  backend NestJS (réponse `{ accessToken, refreshToken, role, schoolId,
  studentId }` — pas d'objet `user` avec prénom/nom, cf. note §5.1), pose des
  cookies httpOnly (`auth_token`, `auth_refresh`) et rejette au niveau de la
  route si `role !== 'DIRECTION'`. Le JWT ne touche jamais le JS client.
- `src/middleware.ts` : protège `/dashboard/*`, redirige selon le rôle.
  Seul `DIRECTION` a accès à ce premier lot (`ADMIN` — pas d'écran dédié
  aujourd'hui côté mobile non plus — reste hors scope).
- `src/app/api/[...path]/route.ts` : proxy REST générique, injecte
  `Authorization: Bearer <token>` depuis le cookie.
- `src/app/api/dashboard/stream/route.ts` : route dédiée qui **stream** la
  réponse SSE du backend (passthrough du `ReadableStream`, pas de
  `arrayBuffer()` comme le proxy générique) — le navigateur ouvre
  l'`EventSource` sur cette route Next.js, jamais directement sur le backend
  (évite d'exposer le token dans une URL).

### 5.3 Pages (rôle `DIRECTION`)

| Route | Contenu |
|---|---|
| `/login` | Formulaire identifiant/mot de passe |
| `/dashboard` | Vue d'ensemble temps réel (KPIs jour), alertes, tendance hebdo/mensuelle, comparaison classes |
| `/dashboard/classes` | Liste/CRUD des classes + assignation enseignant |
| `/dashboard/personnel` | Liste du personnel, création compte enseignant/surveillant, désactivation |
| `/dashboard/absences` | Liste des absences, justification, filtres classe/période |
| `/dashboard/profil` | Infos du compte direction connecté |

Hors scope pour ce lot : gestion des fiches élèves côté web (déjà géré côté
mobile par la Direction — le dashboard web est pilotage/lecture, pas un
doublon de la saisie mobile).

## 6. Sécurité

- Réutilisation intégrale de `JwtAuthGuard`/`RolesGuard`/`TenantContext` —
  aucun nouveau système d'auth côté backend, seulement de nouveaux endpoints
  gardés par `@Roles('DIRECTION')` (ou `PARENT` pour la justification
  d'absence, avec contrôle d'appartenance).
- `JwtAuthGuard` vérifie `disabledAt` à chaque requête (pas seulement au
  login) pour qu'une désactivation de compte soit immédiate.
- Cookies httpOnly + `SameSite` côté dashboard — pas de JWT en `localStorage`.

## 7. Notifications

- Événement d'absence détectée → même bus d'événements que les pointages,
  consommé par `NotificationsService` étendu : SMS (toujours sur le provider
  mock — une vraie passerelle SMS Congo reste un sujet séparé, non traité
  ici) + push Expo si `expoPushToken` renseigné.

## 8. Tests

- Backend (Jest) : job d'absence — élève avec pointage tardif non marqué
  absent ; idempotence si le cron tourne deux fois sur la même date ; règles
  d'accès (`DIRECTION` seule sur classes/staff, `PARENT` restreint à ses
  propres enfants pour la justification).
- Frontend : pas de suite e2e dans ce lot (cohérent avec le reste du projet
  aujourd'hui) ; vérification manuelle via `npm run dev` sur les flux clés
  (login, dashboard temps réel, création compte, justification absence).

## 9. Hors scope (rappel)

- Vraie passerelle SMS (reste un provider mock).
- Gestion des fiches élèves côté web.
- Rôle `ADMIN` multi-écoles côté dashboard.
- Rapports exportables PDF/Excel (non demandé dans cette conversation —
  à reprendre séparément si besoin).
