export type ParentGuardian = {
  id: string;
  fullName: string;
  relationship: string;
  phoneNumber: string;
  secondaryPhoneNumber: string | null;
  address: string | null;
  notificationChannel: 'PUSH' | 'SMS' | 'BOTH';
};

export type StudentDetail = {
  id: string;
  schoolId: string;
  schoolClassId: string;
  lastName: string;
  middleName: string | null;
  firstName: string;
  sex: string;
  dateOfBirth: string;
  photoUrl: string | null;
  parents: ParentGuardian[];
  schoolClass: { id: string; name: string; promotion: string };
};

export type ParentGuardianInput = {
  fullName: string;
  relationship: string;
  phoneNumber: string;
  secondaryPhoneNumber?: string;
  address?: string;
  notificationChannel?: 'PUSH' | 'SMS' | 'BOTH';
};

export type StudentInput = {
  lastName: string;
  middleName?: string;
  firstName: string;
  sex: string;
  dateOfBirth: string;
  schoolClassId: string;
  parent?: ParentGuardianInput;
};
