import { Model } from '@nozbe/watermelondb';
import { date, field, relation, text } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';

import type Student from '@/db/models/Student';

export type Checkpoint = 'portail' | 'classe';
export type AttendanceDirection = 'entree' | 'sortie';

export default class AttendanceRecord extends Model {
  static table = 'attendance_records';
  static associations = {
    students: { type: 'belongs_to' as const, key: 'student_id' },
  };

  @text('server_id') serverId?: string;
  @text('student_id') studentId!: string;
  @text('checkpoint') checkpoint!: Checkpoint;
  @text('direction') direction!: AttendanceDirection;
  @date('recorded_at') recordedAt!: Date;
  @field('is_late') isLate!: boolean;
  @date('synced_at') syncedAt?: Date;

  @relation('students', 'student_id') student!: Relation<Student>;
}
