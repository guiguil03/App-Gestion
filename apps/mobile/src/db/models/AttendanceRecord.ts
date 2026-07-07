import { Model } from '@nozbe/watermelondb';
import { date, field, relation, text } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';

import type Student from '@/db/models/Student';

export type Checkpoint = 'portail' | 'classe';
export type AttendanceDirection = 'entree' | 'sortie';

// Pas de `!` (definite assignment assertion) sur les champs décorés : Babel
// (via @babel/plugin-proposal-decorators en mode legacy) plante dessus. Les
// décorateurs WatermelonDB assignent la valeur au runtime ; voir
// strictPropertyInitialization: false dans tsconfig.json.
export default class AttendanceRecord extends Model {
  static table = 'attendance_records';
  static associations = {
    students: { type: 'belongs_to' as const, key: 'student_id' },
  };

  @text('student_id') studentId: string;
  @text('checkpoint') checkpoint: Checkpoint;
  @text('direction') direction: AttendanceDirection;
  @date('recorded_at') recordedAt: Date;
  @field('is_late') isLate: boolean;
  @date('synced_at') syncedAt?: Date;
  // Non-null uniquement pour un pointage auto-scanné par l'élève via un QR
  // de session — null pour un scan de carte classique.
  @text('session_id') sessionId?: string;

  @relation('students', 'student_id') student: Relation<Student>;
}
