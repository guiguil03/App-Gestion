import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'schools',
          columns: [{ name: 'card_signing_public_key', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'assigned_classes',
          columns: [{ name: 'school_class_id', type: 'string', isIndexed: true }],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'attendance_records',
          columns: [{ name: 'session_id', type: 'string', isOptional: true, isIndexed: true }],
        }),
        createTable({
          name: 'attendance_sessions',
          columns: [
            { name: 'school_class_id', type: 'string', isIndexed: true },
            { name: 'teacher_id', type: 'string', isIndexed: true },
            { name: 'opened_at', type: 'number' },
            { name: 'expires_at', type: 'number' },
            { name: 'closed_at', type: 'number', isOptional: true },
            { name: 'synced_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'teacher_signing_keys',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'public_key', type: 'string' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'parent_guardians',
          columns: [{ name: 'address', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'schools',
          columns: [
            { name: 'geofence_corners', type: 'string', isOptional: true },
            { name: 'scan_window_start', type: 'string', isOptional: true },
            { name: 'scan_window_end', type: 'string', isOptional: true },
          ],
        }),
        addColumns({
          table: 'attendance_records',
          columns: [
            { name: 'latitude', type: 'number', isOptional: true },
            { name: 'longitude', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
