import { Model } from '@nozbe/watermelondb';
import { text } from '@nozbe/watermelondb/decorators';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class AssignedClass extends Model {
  static table = 'assigned_classes';

  @text('school_class_id') schoolClassId: string;
}
