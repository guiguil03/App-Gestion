import { isAxiosError } from 'axios';

/** Message lisible pour une erreur d'API élève/carte — jamais un écran vide silencieux. */
export function getStudentErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) {
      return "Tu n'as pas accès à cette fiche.";
    }
    if (error.response?.status === 404) {
      return 'Fiche introuvable.';
    }
    if (!error.response) {
      return 'Impossible de joindre le serveur — vérifie ta connexion.';
    }
  }
  return 'Une erreur est survenue lors du chargement.';
}
