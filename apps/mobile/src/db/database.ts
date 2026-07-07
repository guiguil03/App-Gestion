import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import AttendanceRecord from '@/db/models/AttendanceRecord';
import School from '@/db/models/School';
import Student from '@/db/models/Student';
import { schema } from '@/db/schema';

// NOTE: WatermelonDB's SQLite adapter uses native (JSI) modules, unavailable
// in Expo Go — only a custom dev client (expo-dev-client / EAS build)
// provides them. Constructing it there throws, so we catch that here and
// expose `null` instead of crashing the whole app; screens fall back to a
// placeholder via useOptionalDatabase() until a real dev client is built.
function createDatabase(): Database | null {
  try {
    const adapter = new SQLiteAdapter({ schema, jsi: true });
    return new Database({ adapter, modelClasses: [Student, AttendanceRecord, School] });
  } catch {
    return null;
  }
}

export const database = createDatabase();
