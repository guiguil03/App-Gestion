// apps/mobile/src/features/classes/SelectedClassContext.tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import SchoolClass from '@/db/models/SchoolClass';
import { useAssignedClasses } from '@/features/classes/hooks/useAssignedClasses';

type SelectedClassContextValue = {
  classes: SchoolClass[];
  classesLoading: boolean;
  selectedClassId: string | null;
  setSelectedClassId: (id: string) => void;
};

const SelectedClassContext = createContext<SelectedClassContextValue | null>(null);

/**
 * Classe sélectionnée partagée entre tous les écrans enseignant (Dashboard,
 * Classe, Historique, Session) — sans ça, chaque écran gardait son propre
 * état et "oubliait" le choix de l'enseignant en changeant d'onglet.
 */
export function SelectedClassProvider({ children }: { children: ReactNode }) {
  const { classes, isLoading: classesLoading } = useAssignedClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      if (selectedClassId !== null) setSelectedClassId(null);
      return;
    }
    const stillAssigned = classes.some((schoolClass) => schoolClass.id === selectedClassId);
    if (!stillAssigned) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const value = useMemo(
    () => ({ classes, classesLoading, selectedClassId, setSelectedClassId }),
    [classes, classesLoading, selectedClassId],
  );

  return <SelectedClassContext.Provider value={value}>{children}</SelectedClassContext.Provider>;
}

export function useSelectedClass(): SelectedClassContextValue {
  const context = useContext(SelectedClassContext);
  if (!context) {
    throw new Error('useSelectedClass must be used within a SelectedClassProvider');
  }
  return context;
}
