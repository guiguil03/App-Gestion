import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import AttendanceRecord from '@/db/models/AttendanceRecord';
import Student from '@/db/models/Student';
import { schema } from '@/db/schema';

// NOTE: WatermelonDB's SQLite adapter uses native (JSI) modules, so this app
// must run through a custom dev client (expo-dev-client / EAS build) rather
// than Expo Go.
const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Student, AttendanceRecord],
});
