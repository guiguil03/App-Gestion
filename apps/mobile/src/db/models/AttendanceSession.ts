import { Model } from '@nozbe/watermelondb';
import { date, text } from '@nozbe/watermelondb/decorators';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class AttendanceSession extends Model {
  static table = 'attendance_sessions';

  @text('school_class_id') schoolClassId: string;
  @text('teacher_id') teacherId: string;
  @date('opened_at') openedAt: Date;
  @date('expires_at') expiresAt: Date;
  @date('closed_at') closedAt?: Date;
  @date('synced_at') syncedAt?: Date;

  get isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime();
  }
}
