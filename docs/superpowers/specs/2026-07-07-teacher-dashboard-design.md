# Dashboard enseignant/surveillant avant scan

## Contexte

Aujourd'hui, un enseignant/surveillant qui se connecte est redirigé directement
vers l'écran de scan caméra (`/(teacher)/scan`). L'objectif est d'intercaler un
écran d'accueil (dashboard) affichant des données de présence, avec un bouton
explicite pour ouvrir le scan.

## Flux de navigation

- Avant : login → `/(teacher)/scan`.
- Après : login → `/(teacher)` (dashboard) → bouton "Scanner" → `/(teacher)/scan`
  → bouton retour explicite → dashboard.
- `roleGuard.ts` : `initialRouteForRole` renvoie `/(teacher)` au lieu de
  `/(teacher)/scan` pour `ENSEIGNANT`, `SURVEILLANT`, `DIRECTION`, `ADMIN`.
- Le comportement de scan continu (cooldown, feedback banner) est inchangé.
  Le seul ajout sur `scan.tsx` est un bouton retour (flèche, en haut à gauche,
  même style absolu que le sélecteur portail/classe existant) qui fait
  `router.back()`.

## Backend — assignation classes ↔ enseignant

Il n'existe aujourd'hui aucune notion de "classes assignées à un enseignant" :
`User` n'a pas de relation vers `SchoolClass`.

- `prisma/schema.prisma` : relation many-to-many implicite —
  `User.assignedClasses SchoolClass[]` / `SchoolClass.assignedTeachers User[]`.
  Une migration Prisma (`prisma migrate dev`) crée la table de jointure
  implicite.
- Pas d'UI d'admin pour gérer ces assignations (décidé hors scope pour cette
  itération). Mécanisme temporaire : `prisma/seed.ts` — le seed existant crée
  déjà `surveillant1` et une classe `CM2 A` ; on ajoute
  `assignedClasses: { connect: [{ id: schoolClass.id }] }` sur la création de
  `surveillant1`. Pour changer les assignations, éditer ce fichier et relancer
  `npm run seed`.
- `sync.service.ts` : `pull()` reçoit en plus `userId` (déjà disponible via
  `@CurrentUser()` dans `sync.controller.ts`) et renvoie un nouveau bucket
  `assigned_classes` contenant uniquement `school_class_id`, pour les classes
  assignées à cet utilisateur. Toujours la liste complète à chaque pull (pas
  de filtrage incrémental par `since` — volume négligeable).

## Mobile — schéma local & modèles

- `schema.ts` : version 3, nouvelle table `assigned_classes`
  (colonne `school_class_id`).
- `migrations.ts` : étape `toVersion: 3` avec `createTable` pour
  `assigned_classes`.
- Nouveaux modèles WatermelonDB (pattern de `School.ts`) :
  - `SchoolClass.ts` — la table `school_classes` existe déjà dans le schéma
    mais n'avait pas de classe modèle ; nécessaire pour afficher nom/promotion
    sur le dashboard.
  - `AssignedClass.ts` — lecture de la liste des `school_class_id` assignés à
    l'utilisateur courant.
- Ces deux tables suivent le même chemin générique que `school_classes`/
  `students` côté application du pull sync — pas de logique spécifique
  supplémentaire à ajouter dans le service de sync mobile.

## Mobile — écran dashboard (`(teacher)/index.tsx`)

- **Sélecteur de classe** : si plusieurs classes assignées, rangée d'onglets
  en haut (même style que le sélecteur portail/classe de `scan.tsx`) pour
  choisir la classe active. Une seule classe assignée → pas de sélecteur.
- **Résumé du jour** (classe sélectionnée) : Présents / En retard / Absents,
  calculés à partir des `attendance_records` du jour pour les élèves de la
  classe, comparés à l'effectif total de la classe.
- **Derniers scans** : liste des `attendance_records` du jour pour cette
  classe, triée par heure décroissante (nom élève, heure, checkpoint, badge
  "en retard").
- **Bouton "Scanner"** : bouton principal en bas, navigue vers
  `/(teacher)/scan`.
- Nouveau hook `useClassAttendanceSummary(classId)` dans
  `features/attendance/hooks/`, suivant le pattern de `useRecordAttendance`.

## Cas limites

- **Expo Go (pas de base locale)** : même message d'avertissement que
  `scan.tsx` ("nécessite un dev client").
- **Aucune classe assignée** : message "Aucune classe assignée — contacte
  l'administration."
- **Portée des données** : les `attendance_records` ne sont que *poussés* vers
  le serveur (jamais repull), donc le résumé du jour et la liste des derniers
  scans ne reflètent que les scans faits **depuis cet appareil**, pas les
  scans faits par d'autres surveillants sur d'autres appareils. C'est une
  limite déjà existante de l'architecture de sync actuelle, pas une régression
  introduite par cette fonctionnalité — à corriger dans une itération future
  si besoin d'une vue agrégée multi-appareils.

## Tests

Ni le backend ni le mobile n'ont de suite de tests configurée actuellement
(pas de script `test` dans les `package.json`). Cette fonctionnalité n'en
introduit donc pas non plus ; la vérification se fait manuellement :
- Backend : relancer `npm run seed`, vérifier via `sync/pull` (curl/Postman)
  que le bucket `assigned_classes` contient bien la classe assignée.
- Mobile : login avec `surveillant1`, vérifier que le dashboard affiche la
  classe assignée, le résumé du jour, les derniers scans, et que le bouton
  "Scanner" puis le bouton retour fonctionnent.
