import { IsString, MinLength } from 'class-validator';

export class JustifyAbsenceDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
