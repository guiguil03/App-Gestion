export type ManualAttendanceInput = {
  date: string;
  time: string;
  isLate: boolean;
};

export type PresenceRecord = {
  id: string;
  student: {
    id: string;
    lastName: string;
    middleName: string | null;
    firstName: string;
    schoolClass: { id: string; name: string; promotion: string };
  };
  checkpoint: 'PORTAIL' | 'CLASSE';
  direction: 'ENTREE' | 'SORTIE';
  recordedAt: string;
  isLate: boolean;
  isManual: boolean;
};

export type PresenceListParams = {
  date: string;
  schoolClassId?: string;
  search?: string;
};
