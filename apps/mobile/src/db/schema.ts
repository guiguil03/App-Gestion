import { appSchema, tableSchema } from '@nozbe/watermelondb';

// NOTE: the built-in WatermelonDB `id` column IS the id shared with the
// backend (the sync protocol matches records by `id` in both directions),
// so no separate `server_id` column is needed anywhere in this schema.
export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'schools',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'attendance_reference_time', type: 'string' }, // "HH:mm"
        { name: 'attendance_tolerance_minutes', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'school_classes',
      columns: [
        { name: 'school_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'promotion', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'students',
      columns: [
        { name: 'school_id', type: 'string', isIndexed: true },
        { name: 'school_class_id', type: 'string', isIndexed: true },
        { name: 'last_name', type: 'string' },
        { name: 'middle_name', type: 'string', isOptional: true },
        { name: 'first_name', type: 'string' },
        { name: 'sex', type: 'string' },
        { name: 'date_of_birth', type: 'string' },
        { name: 'photo_url', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'parent_guardians',
      columns: [
        { name: 'student_id', type: 'string', isIndexed: true },
        { name: 'full_name', type: 'string' },
        { name: 'relationship', type: 'string' },
        { name: 'phone_number', type: 'string' },
        { name: 'secondary_phone_number', type: 'string', isOptional: true },
        { name: 'notification_channel', type: 'string' }, // 'push' | 'sms' | 'both'
      ],
    }),
    tableSchema({
      name: 'student_cards',
      columns: [
        { name: 'student_id', type: 'string', isIndexed: true },
        { name: 'card_id', type: 'string', isIndexed: true }, // UUID encoded in the QR
        { name: 'signature', type: 'string' }, // base64 Ed25519 signature
        { name: 'issued_at', type: 'number' },
        { name: 'revoked', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'attendance_records',
      columns: [
        { name: 'student_id', type: 'string', isIndexed: true },
        { name: 'checkpoint', type: 'string' }, // 'portail' | 'classe'
        { name: 'direction', type: 'string' }, // 'entree' | 'sortie'
        { name: 'recorded_at', type: 'number' },
        { name: 'is_late', type: 'boolean' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'absences',
      columns: [
        { name: 'student_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string' }, // "YYYY-MM-DD"
        { name: 'justified', type: 'boolean' },
        { name: 'justification_reason', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'revoked_cards',
      columns: [{ name: 'card_id', type: 'string', isIndexed: true }],
    }),
  ],
});
