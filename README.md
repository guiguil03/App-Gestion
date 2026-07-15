# App Gestion — Présence Scolaire

Application de suivi de présence scolaire pour un établissement : gestion des
fiches élèves, cartes QR, pointage (par carte ou par session), suivi parent.
L'application mobile fonctionne **hors ligne en priorité** (WatermelonDB) avec
synchronisation différée vers un backend central.

## Structure du monorepo

```
apps/
  backend/   API NestJS + PostgreSQL (Prisma)
  mobile/    App Expo (React Native) — direction / enseignant / surveillant / parent / élève
```

Les deux applications sont indépendantes (pas de workspace npm racine) :
chacune a son propre `package.json` et s'installe séparément.

## Stack technique

- **Backend** : NestJS, Prisma (PostgreSQL), JWT (access + refresh token),
  signatures Ed25519 (`@noble/ed25519`) pour les QR codes, upload de photos
  local (multer, servi en statique).
- **Mobile** : Expo (expo-router), WatermelonDB (SQLite offline-first),
  React Query (appels REST en ligne : gestion élèves/cartes), expo-camera
  (scan), expo-print + expo-sharing (export carte imprimable),
  react-native-qrcode-svg.

## Rôles et écrans

| Rôle | Onglets mobile | Peut faire |
|---|---|---|
| `DIRECTION` | Élèves, Profil | Créer/modifier la fiche complète d'un élève (identité, photo, infos parent), émettre/réémettre sa carte QR (export PDF imprimable), provisionner un compte `ELEVE` ou `PARENT`. |
| `ENSEIGNANT` / `SURVEILLANT` | Dashboard, Classe, Scan, Historique, Profil | Scanne les cartes élèves aux checkpoints (portail/salle de classe), ouvre une **session** de présence pour sa classe (QR à faire scanner par les élèves), consulte dashboard et historique de ses classes assignées. |
| `PARENT` | Enfants, Historique, Profil | Consulte et **modifie** la fiche de ses propres enfants (identité + photo + coordonnées), consulte leur historique de présence. |
| `ELEVE` | Scanner, Ma carte, Historique, Profil | Scanne le QR de session de son enseignant pour pointer sa présence, consulte sa propre carte QR et sa fiche d'identité, consulte son historique. |

`ADMIN` n'a pas d'écran mobile dédié (redirigé vers le dashboard enseignant en
lecture).

## Flux de présence

### 1. Pointage par carte (checkpoint)

Chaque élève a une carte QR signée par la clé privée de l'école
(`School.cardSigningPrivateKey`, ne quitte jamais le backend). L'enseignant/
surveillant scanne la carte ; la vérification de signature se fait 100 % hors
ligne côté mobile grâce à la clé publique synchronisée. Carte gérée côté
Direction (`Élèves` → fiche élève → `Carte`) : émission, réémission (perte/
vol — révoque automatiquement l'ancienne), export PDF au format carte
imprimable.

### 2. Pointage par session (auto-scan élève)

Un enseignant ouvre une **session** pour la classe actuellement sélectionnée
(écran *Classe* → *Créer une session*) : un QR signé par la clé propre de son
appareil (générée une fois, jamais transmise) s'affiche avec un compte à
rebours (15 min par défaut, fermeture manuelle possible). Chaque élève
scanne ce QR depuis son propre compte `ELEVE` (onglet *Scanner*) pour valider
sa présence — vérification de signature, expiration et détection de doublon
également 100 % hors ligne ; la synchronisation ne fait que remonter le
résultat au backend.

### 3. Fiche élève et comptes

Il n'existe pas de flux d'inscription en ligne : la Direction crée la fiche
d'un élève (identité, classe, photo, informations du parent/tuteur) puis peut
générer :
- un compte `ELEVE` (`POST /students/:id/account`) ;
- un compte `PARENT` (`POST /students/:id/parents/:parentId/account`) — si un
  compte existe déjà pour ce même numéro de téléphone (fratrie), l'enfant est
  simplement rattaché au compte existant au lieu d'en créer un second.

Le mot de passe généré n'est affiché qu'une fois — à transmettre
immédiatement, il n'est jamais récupérable ensuite (seul un nouveau
provisioning peut le réinitialiser).

Un compte `PARENT` ne voit et ne peut modifier que ses propres enfants
(relation `User.children`) ; toute tentative sur un autre élève renvoie 403.

## Prérequis

- Node.js 20+
- PostgreSQL (via Docker ou installation locale)
- Un téléphone/émulateur Android ou iOS avec un **dev client** pour l'app
  mobile (WatermelonDB, expo-camera, expo-print et le polyfill crypto sont
  incompatibles avec Expo Go)

## Mise en route — Backend

```bash
cd apps/backend
npm install
cp .env.example .env   # ajuster DATABASE_URL / JWT_SECRET / PORT si besoin
docker compose -f ../../docker-compose.yml up -d   # postgres + redis
npm run prisma:migrate   # applique les migrations
npm run seed              # jeu de données de démo (ATTENTION : réinitialise toute la base)
npm run start:dev
```

Les photos élève uploadées sont stockées localement dans `apps/backend/uploads/`
(non versionné) et servies sous `/uploads/*`.

### Identifiants de démo (créés par `npm run seed`)

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| DIRECTION | `direction1` | `changeme123` |
| SURVEILLANT | `surveillant1` | `changeme123` |
| PARENT | `parent1` | `changeme123` |
| ELEVE | (2 comptes, affichés dans la sortie du seed) | généré aléatoirement |

`npm run seed` recrée aussi les 2 comptes `ELEVE` de démo à chaque exécution
(mot de passe régénéré et affiché en console) — toute donnée créée
manuellement depuis (comptes parent provisionnés, élèves ajoutés, etc.) est
perdue à chaque reseed.

## Mise en route — Mobile

```bash
cd apps/mobile
npm install
# ajuster EXPO_PUBLIC_API_URL dans .env pour pointer vers l'IP locale du backend
npx expo run:android   # ou run:ios — build native requise (dev client)
```

L'app détecte l'absence de base WatermelonDB (ex. Expo Go) et affiche un
message explicite plutôt que de planter.

⚠️ **Toute dépendance native ajoutée nécessite une vraie reconstruction**
(`npx expo run:android` / `run:ios`, pas un simple reload Metro) : c'est le
cas notamment de `react-native-get-random-values` (polyfill `crypto.
getRandomValues`, requis par la signature Ed25519 des sessions côté
enseignant — voir `apps/mobile/index.js`). Un reload Metro seul reproduit
l'erreur `RNGetRandomValues could not be found`.

## État du projet

- Fonctionnels : pointage (carte + session), gestion complète des fiches
  élèves côté Direction (identité, photo, carte QR imprimable, provisioning
  de comptes), édition par les parents de leurs propres enfants, dashboard
  enseignant (mobile), historiques (élève/parent/enseignant), détection
  automatique des absences, dashboard web direction (`apps/dashboard`) avec
  vue d'ensemble temps réel, gestion des classes/personnel/élèves/absences.
- Géorepérage du pointage : périmètre GPS (4 coins) et plage horaire
  configurables par école depuis `apps/dashboard` (Paramètres) ; un pointage
  hors périmètre ou hors horaire n'est pas enregistré (vérifié côté appareil
  pour un feedback immédiat même hors ligne, revérifié côté serveur à la
  synchro). Désactivé par défaut tant que l'école n'a pas configuré son
  périmètre.
- Notifications : SMS (provider mock, passerelle opérateur réelle non
  branchée) + push Expo pour les comptes parent avec un token enregistré.
- Photos élève : stockage disque local uniquement (pas de S3/cloud storage).
