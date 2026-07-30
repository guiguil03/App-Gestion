export type StudentAttendanceSummary = {
  student: {
    id: string;
    lastName: string;
    middleName: string | null;
    firstName: string;
    schoolClass: { id: string; name: string; promotion: string };
  };
  presencesCount: number;
  lateCount: number;
  absencesJustifiedCount: number;
  absencesUnjustifiedCount: number;
};

export type AttendanceSummaryParams = {
  schoolClassId?: string;
  startDate: string;
  endDate: string;
};

export type AttendanceHistoryStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export type AttendanceHistoryEntry = {
  student: StudentAttendanceSummary['student'];
  date: string;
  status: AttendanceHistoryStatus;
  justified: boolean | null;
  justificationReason: string | null;
  recordedAt: string | null;
};

export type AttendanceHistoryParams = {
  schoolClassId?: string;
  studentId?: string;
  status?: 'present' | 'late' | 'absent';
  startDate: string;
  endDate: string;
};
