# NavBar bottom-tabs + refonte visuelle mobile

## Contexte

L'app mobile n'a aujourd'hui qu'un `Stack` unique (`app/_layout.tsx`), sans
navigation persistante. Chaque rôle atterrit sur un unique écran après login
(`(teacher)/dashboard`, `(parent)/children`) et le reste des écrans se
navigue par `router.push`/`router.back()`. Objectif : passer à une barre
d'onglets en bas d'écran par rôle, ajouter les écrans manquants (Classe,
Historique, Profil), et repolir visuellement les écrans existants
(Login, Dashboard, Scan, Enfants) avec une vraie librairie d'icônes.

## Navigation

Structure en tab layouts imbriqués, `_layout.tsx` racine (Stack) inchangé,
`roleGuard.ts` inchangé (`initialRouteForRole` continue de renvoyer
`/(teacher)/dashboard` ou `/(parent)/children`, qui vivent désormais sous un
`<Tabs>` au lieu d'un stack nu) :

```
app/
  (teacher)/
    _layout.tsx   ← NOUVEAU : <Tabs> (Dashboard, Classe, Scan, Historique, Profil)
    dashboard.tsx  (existant, repoli)
    classe.tsx     ← NOUVEAU
    scan.tsx       (existant, repoli — bouton "← Retour" retiré, plus nécessaire en tab)
    historique.tsx ← NOUVEAU
    profil.tsx     ← NOUVEAU
  (parent)/
    _layout.tsx   ← NOUVEAU : <Tabs> (Enfants, Historique, Profil)
    children.tsx   (existant, repoli)
    historique.tsx ← NOUVEAU
    profil.tsx     ← NOUVEAU
```

- Couleur active des tabs : `#208AEF` (brand color existante). Icônes actives
  en variante pleine, inactives en variante `-outline`, via
  `@expo/vector-icons` (`Ionicons`, déjà inclus avec `expo`, aucune nouvelle
  dépendance).
- Mapping icônes : Dashboard `home`/`home-outline`, Classe/Enfants
  `people`/`people-outline`, Scan `camera`/`camera-outline`, Historique
  `time`/`time-outline`, Profil `person-circle`/`person-circle-outline`.
- La tab bar reste visible sur l'écran Scan (pas de masquage conditionnel :
  simplicité, ajustable plus tard si besoin).

## Écrans

- **Classe** (enseignant) — réutilise le sélecteur de classe du dashboard ;
  liste des élèves de la classe sélectionnée avec badge présent / retard /
  absent par élève. Nouveau hook `useClassRoster(classId)` dans
  `features/classes/hooks/`, calqué sur `useClassAttendanceSummary` (croise
  `students` where `school_class_id` avec `attendance_records` du jour).
- **Historique enseignant** — pour la classe sélectionnée, liste des jours
  passés avec résumé (X absents, Y retards), tri anté-chronologique, tap sur
  un jour → détail des scans de ce jour (réutilise `ScanFeedbackBanner`-style
  row du dashboard). Nouveau hook `useClassHistory(classId)` dans
  `features/attendance/hooks/`, regroupe `attendance_records` par jour
  calendaire pour les élèves de la classe.
- **Historique parent** — sélecteur d'enfant (si plusieurs enfants, même
  pattern que le sélecteur de classe), puis même liste par jour mais sur les
  `attendance_records` de l'enfant sélectionné. Nouveau hook
  `useChildHistory(studentId)`.
- **Profil** (les deux rôles, écran partagé
  `features/profile/ProfileScreen.tsx` monté dans les deux
  `(teacher)/profil.tsx` et `(parent)/profil.tsx`) — affiche identifiant,
  rôle, nom de l'école (table locale `schools`, déjà synchronisée), bouton
  Déconnexion. Nouveau hook `useLogout()` dans `api/hooks/` :
  `clearAuthTokens()` + `queryClient.clear()` + `router.replace('/(auth)/login')`.
  - Identifiant/rôle/schoolId proviennent du payload du JWT access token
    (décodage base64 du payload, sans vérification de signature — usage
    display-only) via un utilitaire `decodeAccessTokenPayload()` dans
    `services/secureStorage.ts`, plutôt que de dupliquer ces infos dans une
    nouvelle table ou un contexte React.

## Repolissage visuel des écrans existants

- **Login** — passage de couleurs en dur à `ThemedView`/`ThemedText` (support
  dark mode, cohérent avec le reste de l'app) ; remplacement de l'emoji logo
  🏫 par une icône `Ionicons` (`school`) dans le badge existant.
- **Dashboard** — les icônes emoji des `SummaryStat` (✓ ⏱ ✕) et du bouton
  scan (📷) deviennent des `Ionicons` (`checkmark-circle`, `time`,
  `close-circle`, `camera`), même tailles/couleurs qu'actuellement.
- **Scan** — retrait du bouton "← Retour" (devient un tab, plus de
  navigation push/back à gérer) ; le sélecteur de checkpoint et le style
  général sont inchangés.
- **Enfants** (parent) — alignement du style de ligne sur celui du dashboard
  enseignant (avatar rond avec initiale, `ThemedView type="backgroundElement"`)
  pour cohérence visuelle entre rôles.

## Hors scope

- Pas de nouveaux endpoints backend : tout est dérivé des données déjà
  synchronisées localement (`attendance_records`, `students`, `schools`).
- Pas de masquage conditionnel de la tab bar sur l'écran Scan.
- Pas de persistance de session au démarrage de l'app (`index.tsx` garde son
  TODO existant, hors scope de cette itération).
- Pas de correctif sur le warning de sync `revoked_cards` manquant côté
  WatermelonDB (bug pré-existant, indépendant de ce travail).

## Tests

Pas de suite de tests automatisés côté mobile actuellement (pas de config
Jest/RNTL dans `apps/mobile`). Vérification manuelle via dev client, pour
chaque rôle : navigation entre les 5 (resp. 3) onglets, affichage des
données, déconnexion puis reconnexion.
