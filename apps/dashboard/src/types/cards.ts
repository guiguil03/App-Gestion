export type CardStudent = {
  id: string;
  lastName: string;
  middleName: string | null;
  firstName: string;
  photoUrl: string | null;
  schoolClass: { id: string; name: string; promotion: string };
};

export type ActiveCard = { id: string; issuedAt: string; qrCode: string };
export type CardHistoryEntry = { id: string; issuedAt: string; revokedAt: string };

export type StudentCardStatus = {
  student: CardStudent;
  activeCard: ActiveCard | null;
  history: CardHistoryEntry[];
};

export type IssueBatchResult = { issuedCount: number };

export type IssueCardResult = {
  card: { id: string; studentId: string; issuedAt: string; revoked: boolean };
  qrCode: string;
};
