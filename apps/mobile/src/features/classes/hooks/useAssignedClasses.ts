import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';

import AssignedClass from '@/db/models/AssignedClass';
import SchoolClass from '@/db/models/SchoolClass';
import { useOptionalDatabase } from '@/db/useOptionalDatabase';

export type AssignedClasses = {
  classes: SchoolClass[];
  /** true jusqu'à la première émission de la souscription — permet de distinguer "pas encore chargé" de "aucune classe assignée". */
  isLoading: boolean;
};

/**
 * Classes assignées au compte connecté (relation User.assignedClasses côté
 * backend, cf. prisma/seed.ts — pas encore d'UI d'admin pour les gérer).
 */
export function useAssignedClasses(): AssignedClasses {
  const database = useOptionalDatabase();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!database) {
      setIsLoading(false);
      return;
    }

    let latestAssignments: AssignedClass[] = [];
    let isCancelled = false;
    let callId = 0;

    async function recompute() {
      const currentCallId = ++callId;
      const classIds = latestAssignments.map((assignment) => assignment.schoolClassId);

      if (classIds.length === 0) {
        if (!isCancelled && currentCallId === callId) {
          setClasses([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const schoolClasses = await database!
          .get<SchoolClass>('school_classes')
          .query(Q.where('id', Q.oneOf(classIds)))
          .fetch();
        if (!isCancelled && currentCallId === callId) {
          setClasses(schoolClasses);
          setIsLoading(false);
        }
      } catch {
        if (!isCancelled && currentCallId === callId) setIsLoading(false);
      }
    }

    const assignmentsSubscription = database
      .get<AssignedClass>('assigned_classes')
      .query()
      .observe()
      .subscribe((assignments) => {
        latestAssignments = assignments;
        recompute();
      });

    const schoolClassesSubscription = database
      .get<SchoolClass>('school_classes')
      .query()
      .observe()
      .subscribe(() => recompute());

    return () => {
      isCancelled = true;
      assignmentsSubscription.unsubscribe();
      schoolClassesSubscription.unsubscribe();
    };
  }, [database]);

  return { classes, isLoading };
}
