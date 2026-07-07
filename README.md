# App Gestion — Présence Scolaire

Application de suivi de présence scolaire : les enseignants/surveillants
pointent les entrées/sorties des élèves via QR code, les parents suivent la
présence de leurs enfants, et l'application mobile fonctionne **hors ligne
en priorité** (WatermelonDB) avec synchronisation différée vers un backend
central.

## Structure du monorepo

```
apps/
  backend/   API NestJS + PostgreSQL (Prisma)
  mobile/    App Expo (React Native) — enseignant / surveillant / parent / élève
```

Les deux applications sont indépendantes (pas de workspace npm racine) :
chacune a son propre `package.json` et s'installe séparément.

## Stack technique

- **Backend** : NestJS, Prisma (PostgreSQL), JWT (access + refresh token),
  signatures Ed25519 (`@noble/ed25519`) pour les QR codes.
- **Mobile** : Expo (expo-router), WatermelonDB (SQLite offline-first),
  React Query, expo-camera pour le scan de QR.

## Rôles et flux principaux

| Rôle | Usage |
|---|---|
| `ADMIN` / `DIRECTION` | Administration de l'école, émission/révocation des cartes élèves, provisioning des comptes élèves. |
| `ENSEIGNANT` / `SURVEILLANT` | Scanne les cartes élèves aux checkpoints (portail / salle de classe), consulte le dashboard et l'historique de sa/ses classe(s). |
| `PARENT` | Consulte la présence et l'historique de ses enfants. |
| `ELEVE` | Scanne le QR de session ouvert par son enseignant pour pointer sa propre présence, consulte son historique. |

### Pointage par carte (flux historique)

Chaque élève a une carte QR signée par la clé privée de l'école
(`School.cardSigningPrivateKey`, ne quitte jamais le backend). L'enseignant
scanne la carte avec son téléphone ; la vérification de signature se fait
100 % hors ligne côté mobile grâce à la clé publique synchronisée.

### Pointage par session (auto-scan élève)

En complément, un enseignant peut ouvrir une **session** pour la classe
actuellement sélectionnée (écran *Classe*) : un QR signé par la clé propre
de son appareil (générée une fois, jamais transmise) s'affiche avec un
compte à rebours (15 min par défaut, fermeture manuelle possible). Chaque
élève scanne ce QR depuis son propre compte `ELEVE` pour valider sa
présence — vérification de signature et détection de doublon/expiration
également 100 % hors ligne, la synchronisation ne fait que remonter le
résultat au backend.

## Prérequis

- Node.js 20+
- PostgreSQL (via Docker ou installation locale)
- Un téléphone/émulateur Android ou iOS pour l'app mobile (WatermelonDB
  nécessite un dev client, incompatible avec Expo Go)

## Mise en route — Backend

```bash
cd apps/backend
npm install
cp .env.example .env   # ajuster DATABASE_URL / JWT_SECRET / PORT si besoin
docker compose -f ../../docker-compose.yml up -d postgres   # ou un Postgres local
npm run prisma:migrate   # applique les migrations
npm run seed              # jeu de données de démo (voir identifiants ci-dessous)
npm run start:dev
```

Identifiants de démo créés par le seed (mot de passe `changeme123` sauf
mention contraire) :

- `surveillant1`, `direction1`, `parent1`
- Deux comptes `ELEVE` (identifiant + mot de passe généré, affichés dans la
  sortie du seed)

Un compte `ELEVE` peut aussi être (re)provisionné à la demande par une
`DIRECTION` via `POST /students/:studentId/account` (retourne un mot de
passe en clair, à transmettre immédiatement — il n'est jamais récupérable
ensuite).

## Mise en route — Mobile

```bash
cd apps/mobile
npm install
# ajuster EXPO_PUBLIC_API_URL dans .env pour pointer vers le backend
npx expo start ou npx expo run:android   # ou run:ios — un dev client est nécessaire
```

L'app détecte l'absence de base WatermelonDB (ex. Expo Go) et affiche un
message explicite plutôt que de planter ; utiliser un dev client
(`expo-dev-client` / EAS Build) pour tester les écrans de scan/synchro.

## État du projet

- Suivi de présence (carte + session), dashboard enseignant, app parent :
  fonctionnels.
- Notifications (SMS mock) : squelette en place.
- Rapports, dashboard web direction/admin : pas encore implémentés.
