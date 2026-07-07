import { useEffect, useState } from 'react';

import SchoolClass from '@/db/models/SchoolClass';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

/**
 * Toutes les classes de l'école (pas seulement celles assignées à
 * l'utilisateur courant) — pour la direction, qui gère l'ensemble des
 * classes plutôt qu'un sous-ensemble assigné. Ces données arrivent via le
 * même pull de sync que pour les autres rôles (non filtré par assignation).
 */
export function useSchoolClasses(): { classes: SchoolClass[]; isLoading: boolean } {
  const database = useOptionalDatabase();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!database) {
      setIsLoading(false);
      return;
    }

    const subscription = database
      .get<SchoolClass>('school_classes')
      .query()
      .observe()
      .subscribe((rows) => {
        setClasses(rows);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [database]);

  return { classes, isLoading };
}
