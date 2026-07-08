export type Role = 'ADMIN' | 'DIRECTION' | 'ENSEIGNANT' | 'SURVEILLANT' | 'PARENT' | 'ELEVE';

// `type` distingue un access token d'un refresh token dans le JWT : sans ça,
// un refresh token (valide 30j) serait accepté tel quel comme access token
// par n'importe quel endpoint protégé par JwtAuthGuard.
export type TokenType = 'access' | 'refresh';

export type AuthenticatedUser = {
  userId: string;
  username: string;
  role: Role;
  schoolId: string | null;
  // Renseigné uniquement pour un compte ELEVE — permet à l'app mobile de
  // savoir "qui" elle est sans requête supplémentaire.
  studentId: string | null;
  type: TokenType;
};
