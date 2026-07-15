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
