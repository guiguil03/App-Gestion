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
