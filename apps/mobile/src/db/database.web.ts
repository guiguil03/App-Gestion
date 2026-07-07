import type { Database } from '@nozbe/watermelondb';

// Metro choisit automatiquement ce fichier (suffixe .web.ts) plutôt que
// database.ts quand il bundle pour la plateforme web. Cette app cible
// Android/iOS en priorité (cf. cahier des charges) : le web n'est pas un
// target supporté pour le pointage/l'app parent (le futur dashboard web est
// un projet séparé qui consomme l'API directement, pas WatermelonDB).
// On n'importe donc jamais l'adaptateur SQLite ici : sur web, celui-ci
// résout vers sa variante Node (better-sqlite3), qui ne peut pas être
// empaquetée pour le navigateur et ferait planter le bundling.
export const database: Database | null = null;
