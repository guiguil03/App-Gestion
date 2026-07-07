import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class Student extends Model {
  static table = 'students';

  @text('school_id') schoolId: string;
  @text('school_class_id') schoolClassId: string;
  @text('last_name') lastName: string;
  @text('middle_name') middleName?: string;
  @text('first_name') firstName: string;
  @text('sex') sex: string;
  @text('date_of_birth') dateOfBirth: string;
  @text('photo_url') photoUrl?: string;

  get fullName(): string {
    return [this.lastName, this.middleName, this.firstName].filter(Boolean).join(' ');
  }
}
