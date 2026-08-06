import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAbsenceDto {
  @IsString()
  studentId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format attendu : YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  justificationReason?: string;
}
