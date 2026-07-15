// Le payload de synchronisation WatermelonDB est dynamique par nature (une
// entrée par table locale) : on type ici uniquement ce que chaque rôle peut
// réellement pousser en v1, le reste des tables étant en lecture seule côté
// mobile.
export type RawAttendanceRecord = {
  id: string;
  student_id: string;
  checkpoint: 'portail' | 'classe';
  direction: 'entree' | 'sortie';
  recorded_at: number;
  is_late: boolean;
  // Renseigné uniquement pour un pointage auto-scanné par l'élève via un QR
  // de session (cf. RawAttendanceSessionCreate).
  session_id?: string | null;
  // Position GPS captée sur l'appareil au moment du scan — absente si
  // l'école n'a pas de périmètre configuré ou si la position n'était pas
  // disponible (voir AttendanceService.recordFromSync pour la validation).
  latitude?: number | null;
  longitude?: number | null;
};

// Poussé par l'appareil enseignant à l'ouverture d'une session.
export type RawAttendanceSessionCreate = {
  id: string;
  school_class_id: string;
  opened_at: number;
  expires_at: number;
  // Renseigné si la session a été ouverte ET fermée avant le tout premier
  // push (jamais passée par `updated` de son point de vue local).
  closed_at?: number | null;
};

// Poussé par l'appareil enseignant à la fermeture manuelle d'une session.
export type RawAttendanceSessionClose = {
  id: string;
  closed_at: number;
};

export type PushChangesBody = {
  lastPulledAt: number;
  changes: {
    attendance_records?: {
      created?: RawAttendanceRecord[];
    };
    attendance_sessions?: {
      created?: RawAttendanceSessionCreate[];
      updated?: RawAttendanceSessionClose[];
    };
  };
};
