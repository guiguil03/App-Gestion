export type AdminSchool = {
  id: string;
  name: string;
  studentCount: number;
  presentToday: number;
  rate: number;
};

export type CreatedSchool = {
  school: { id: string; name: string };
  directionAccount: { username: string; password: string };
};

export type AdminAccount = {
  id: string;
  username: string;
  disabledAt: string | null;
};

export type ProvisionedAdminAccount = { username: string; password: string };
