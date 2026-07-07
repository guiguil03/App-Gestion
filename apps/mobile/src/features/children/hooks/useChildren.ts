import { useEffect, useState } from 'react';

import Student from '@/db/models/Student';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

// Le backend ne synchronise vers un compte parent que les fiches de ses
// propres enfants (voir SyncModule) : toute la table locale `students`
// représente donc déjà la liste "mes enfants".
export function useChildren(): Student[] {
  const database = useOptionalDatabase();
  const [children, setChildren] = useState<Student[]>([]);

  useEffect(() => {
    if (!database) return;
    const subscription = database
      .get<Student>('students')
      .query()
      .observe()
      .subscribe(setChildren);
    return () => subscription.unsubscribe();
  }, [database]);

  return children;
}
