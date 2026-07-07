// Le payload de synchronisation WatermelonDB est dynamique par nature (une
// entrée par table locale) : on type ici uniquement ce que le rôle
// Enseignant/Surveillant peut réellement pousser en v1 (les pointages), le
// reste des tables étant en lecture seule côté mobile.
export type RawAttendanceRecord = {
  id: string;
  student_id: string;
  checkpoint: 'portail' | 'classe';
  direction: 'entree' | 'sortie';
  recorded_at: number;
  is_late: boolean;
};

export type PushChangesBody = {
  lastPulledAt: number;
  changes: {
    attendance_records?: {
      created?: RawAttendanceRecord[];
    };
  };
};
