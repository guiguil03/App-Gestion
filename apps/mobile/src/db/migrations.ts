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
  ],
});
