import { IsBoolean, Matches } from 'class-validator';

export class CreateManualAttendanceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format attendu : YYYY-MM-DD' })
  date!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'Format attendu : HH:mm' })
  time!: string;

  @IsBoolean()
  isLate!: boolean;
}
