import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class TeacherSigningKey extends Model {
  static table = 'teacher_signing_keys';

  @text('user_id') userId: string;
  @text('public_key') publicKey: string; // hex Ed25519
}
