# Manuel utilisateur — Présence Scolaire

Ce manuel explique comment utiliser l'application selon votre rôle. Il complète
le [cahier des charges](./Cahier_des_charges_presence_scolaire-1.pdf) (qui
décrit ce que l'application doit faire) en expliquant concrètement **comment**
s'en servir au quotidien.

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Direction — Tableau de bord web](#2-direction--tableau-de-bord-web)
3. [Enseignant / Surveillant — Application mobile](#3-enseignant--surveillant--application-mobile)
4. [Parent / Tuteur — Application mobile](#4-parent--tuteur--application-mobile)
5. [Élève — Application mobile](#5-élève--application-mobile)
6. [Super Admin — Gestion des écoles](#6-super-admin--gestion-des-écoles)
7. [Questions fréquentes](#7-questions-fréquentes)

---

## 1. Vue d'ensemble

L'application suit la présence des élèves par carte à QR code. Deux volets :

- **Le tableau de bord web** (`apps/dashboard`) — utilisé par la Direction et
  le Super Admin, accessible depuis un navigateur.
- **L'application mobile** (`apps/mobile`) — utilisée par les
  enseignants/surveillants, les parents et les élèves.

| Rôle | Où | Peut faire |
|---|---|---|
| Direction | Dashboard web | Tout gérer pour son école : élèves, cartes, classes, personnel, absences, rapports, journal, paramètres. |
| Enseignant / Surveillant | Mobile | Scanner les cartes, ouvrir une session de classe, consulter dashboard/historique de ses classes. |
| Parent | Mobile | Consulter/modifier la fiche de ses enfants, consulter leur historique, justifier une absence. |
| Élève | Mobile | Scanner le QR de session, consulter sa carte et son historique. |
| Super Admin | Dashboard web (`/admin`) | Créer/gérer les écoles, entrer dans une école pour la superviser. |

L'application mobile fonctionne **hors connexion** : le pointage (carte ou
session) est vérifié et enregistré sur l'appareil même sans réseau, puis
synchronisé dès que la connexion revient.

---

## 2. Direction — Tableau de bord web

Connexion sur la page de login avec l'identifiant et le mot de passe fournis
par le Super Admin (ou par une régénération depuis Personnel).

### 2.1. Vue d'ensemble (Dashboard)

Première page après connexion. Affiche en temps réel :

- 4 indicateurs : élèves inscrits, présents, en retard, absents (aujourd'hui).
- Un graphique du taux de présence — bascule **Semaine / Mois** en haut à
  droite du graphique.
- Comparaison des classes (taux de présence par classe).
- Alertes : absences non justifiées récentes, élèves en retard répété.

Un badge en haut à droite indique si la connexion temps réel est active
("Temps réel actif" / "Hors ligne").

### 2.2. Élèves

- **Créer un élève** : formulaire en haut de page (identité + classe,
  informations du parent facultatives à la création).
- **Rechercher / filtrer** : champ de recherche par nom, filtre par classe.
- **Provisionner un compte** : depuis la liste ou la fiche élève, bouton
  "Provisionner compte élève" ou "Provisionner compte parent" — génère un
  identifiant et un mot de passe **affichés une seule fois**. Notez-le
  immédiatement, il n'est plus jamais récupérable (seule une nouvelle
  régénération peut réinitialiser l'accès).
- **Fiche élève** (cliquer sur un nom) : identité complète, carte QR
  (impression/PDF/réémission/révocation), historique des absences.

### 2.3. Cartes

Vue d'ensemble des cartes de toute l'école :

- **Émettre les cartes manquantes** : génère en masse les cartes des élèves
  d'une classe qui n'en ont pas encore (sélectionner la classe d'abord).
- **Imprimer la sélection / Télécharger en PDF** : cocher les élèves
  souhaités, puis exporter au format carte imprimable.
- **Voir** (par élève) : ouvre le détail de la carte (QR, historique,
  réémission en cas de perte/vol, révocation).

### 2.4. Classes

- Créer une classe (nom + promotion).
- Renommer une classe (icône crayon à côté du nom) ou la supprimer (icône
  poubelle, confirmation demandée — les élèves déjà affectés ne sont pas
  supprimés).
- Assigner/retirer un enseignant ou surveillant à une classe.
- Lien "Voir les élèves" pour aller directement à la liste filtrée.

### 2.5. Personnel

- Créer un compte Enseignant, Surveillant ou Direction (identifiant/mot de
  passe générés, affichés une seule fois).
- Désactiver un compte (confirmation demandée). Impossible de désactiver son
  propre compte, ni le dernier compte Direction actif de l'école.

### 2.6. Absences

Liste des absences de l'école, recherche par élève, justification (motif
saisi puis bouton "Justifier"). Une absence non justifiée déclenche déjà une
notification au parent/tuteur (SMS et/ou push) au moment de sa détection.

### 2.7. Rapports

Deux vues, sélectionnables par onglet :

- **Résumé** : compteurs (présences/retards/absences justifiées et non
  justifiées) par élève sur une période, filtrable par classe/élève/statut.
- **Historique** : liste jour par jour (présent/en retard/absent) avec
  heure de pointage et motif d'absence, mêmes filtres + filtre par statut.

Les deux vues s'exportent en **PDF** ou **Excel** via les boutons dédiés.

### 2.8. Journal

Historique des connexions et actions sensibles : provisioning de comptes,
désactivation de personnel, révocation de carte, gestion des classes et
écoles. Filtrable par type d'évènement et par période. Utile pour retracer
"qui a fait quoi et quand" en cas de doute ou d'incident.

### 2.9. Paramètres

- **Périmètre GPS** : coordonnées des 4 coins du terrain de l'école — un
  pointage hors de ce périmètre n'est pas enregistré. Laisser les 4 champs
  vides désactive la restriction.
- **Plage horaire de pointage** : heures de début/fin où le pointage est
  autorisé (indépendant de l'heure de référence retard/absence). Laisser
  vide désactive la restriction.

### 2.10. Profil

Modifier son propre mot de passe.

---

## 3. Enseignant / Surveillant — Application mobile

Onglets : **Dashboard**, **Classe**, **Scan**, **Historique**, **Profil**.

### 3.1. Pointage par carte (checkpoint)

Onglet Scan : scanner la carte QR de chaque élève au portail ou à l'entrée de
la classe. La vérification de signature se fait entièrement hors ligne — le
pointage est confirmé en moins de 2 secondes.

### 3.2. Pointage par session (auto-scan élève)

Onglet Classe → sélectionner sa classe → "Créer une session" : un QR
s'affiche à l'écran (à projeter ou montrer aux élèves), avec un compte à
rebours (15 min par défaut). Chaque élève scanne ce QR depuis son propre
téléphone (onglet Scanner côté élève) pour valider sa présence.

### 3.3. Dashboard et Historique

Vue d'ensemble et historique des pointages pour les classes qui vous sont
assignées.

---

## 4. Parent / Tuteur — Application mobile

Onglets : **Enfants**, **Historique**, **Profil**.

- **Enfants** : liste de vos enfants inscrits. Vous pouvez consulter et
  **modifier** leur fiche (identité, photo, vos propres coordonnées).
- Détail d'un enfant : historique de présence, possibilité de **justifier**
  une absence directement.
- Vous recevez une notification (SMS et/ou push, selon le canal choisi pour
  votre fiche) à chaque arrivée de votre enfant et en cas d'absence.
- Vous ne voyez et ne pouvez modifier que vos propres enfants.

---

## 5. Élève — Application mobile

Onglets : **Scanner**, **Ma carte**, **Historique**, **Profil**.

- **Scanner** : scanner le QR de session affiché par votre enseignant pour
  valider votre présence (fonctionne hors ligne).
- **Ma carte** : votre carte QR personnelle et votre fiche d'identité.
- **Historique** : vos propres présences/absences/retards.

---

## 6. Super Admin — Gestion des écoles

Page `/admin` après connexion (compte Super Admin dédié, pas d'écran mobile).

- Vue d'ensemble : nombre d'écoles, total élèves, taux de présence moyen
  toutes écoles confondues.
- **Créer une école** : génère l'école et son premier compte Direction
  (identifiant/mot de passe affichés une seule fois).
- **Renommer** (icône crayon) ou **désactiver** (icône interdit, confirmation
  demandée) une école.
- **Entrer** dans une école : bascule le Super Admin en vue Direction de
  cette école précise (même dashboard que la Direction). "Toutes les écoles"
  en haut du menu permet de revenir à la liste.

---

## 7. Questions fréquentes

**Un enseignant/parent a oublié son mot de passe, que faire ?**
Il n'existe pas de "mot de passe oublié" en libre-service. La Direction doit
régénérer le compte (Personnel, ou Élèves → fiche élève pour un compte
parent) — un nouveau mot de passe est généré et affiché une seule fois, à
transmettre immédiatement à l'intéressé.

**Un élève a perdu sa carte, ou elle a été volée.**
Direction → Élèves → fiche de l'élève → Carte → "Perte/vol — réémettre une
nouvelle carte". L'ancienne carte est immédiatement invalidée.

**Le pointage est refusé alors que l'élève est bien à l'école.**
Vérifier dans Paramètres que le périmètre GPS et/ou la plage horaire de
pointage ne sont pas trop stricts pour la configuration réelle du terrain.

**Comment savoir qui a fait une action sensible (désactivation, révocation) ?**
Consulter le Journal — chaque action sensible y est horodatée avec
l'identifiant de la personne qui l'a effectuée.

**Les notifications SMS ne partent pas.**
Vérifier avec l'équipe technique que la passerelle SMS (Twilio ou
équivalent) est bien configurée en production — en environnement de
démonstration, les SMS sont simulés (journalisés côté serveur, non
réellement envoyés).
