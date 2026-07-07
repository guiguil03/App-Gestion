import type { Context } from 'react';
import { useContext } from 'react';
import type { Database } from '@nozbe/watermelondb';

// @nozbe/watermelondb's type declarations expose `DatabaseContext` as a type
// alias only (not a value), even though the JS module really does export the
// React Context object at runtime — so it's pulled in via require() here and
// cast to its real type instead of a type-only import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DatabaseContext = require('@nozbe/watermelondb/react/DatabaseContext').default as Context<
  Database | undefined
>;

/**
 * Like WatermelonDB's useDatabase(), but returns null instead of throwing
 * when there's no DatabaseProvider in the tree — that's the case in Expo Go,
 * where the native SQLite module isn't available (see db/database.ts).
 */
export function useOptionalDatabase(): Database | null {
  return useContext(DatabaseContext) ?? null;
}
