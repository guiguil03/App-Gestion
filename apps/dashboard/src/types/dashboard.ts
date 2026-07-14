export type DashboardOverview = {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  rate: number;
};

export type TrendPoint = { date: string; rate: number };

export type ClassComparison = {
  schoolClassId: string;
  name: string;
  totalStudents: number;
  presentCount: number;
  rate: number;
};

export type UnjustifiedAbsence = { absenceId: string; date: string; studentId: string; firstName: string; lastName: string };
export type RepeatedLateness = { studentId: string; firstName: string; lastName: string; lateCount: number };
export type DashboardAlerts = { unjustifiedAbsences: UnjustifiedAbsence[]; repeatedLateness: RepeatedLateness[] };
