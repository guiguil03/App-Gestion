import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class SchoolClass extends Model {
  static table = 'school_classes';

  @text('school_id') schoolId: string;
  @text('name') name: string;
  @text('promotion') promotion: string;
}
