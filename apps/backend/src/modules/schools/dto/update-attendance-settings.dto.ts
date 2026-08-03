import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateAttendanceSettingsDto {
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu : HH:mm' })
  scanWindowStart?: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu : HH:mm' })
  scanWindowEnd?: string | null;

  // Heure limite (portail/ENTREE) après laquelle un pointage est considéré en
  // retard, et à partir de laquelle AbsenceDetectionJob marque absent (+ tolérance).
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu : HH:mm' })
  attendanceReferenceTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  attendanceToleranceMinutes?: number;
}
