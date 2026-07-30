import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class JustifyAbsencesBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  absenceIds!: string[];

  @IsString()
  @MinLength(1)
  reason!: string;
}
