import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class School extends Model {
  static table = 'schools';

  @text('name') name: string;
  @text('attendance_reference_time') attendanceReferenceTime: string; // "HH:mm"
  @field('attendance_tolerance_minutes') attendanceToleranceMinutes: number;
  @text('card_signing_public_key') cardSigningPublicKey?: string; // hex Ed25519
}
