import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';

import { ParentGuardianDto } from '@/modules/students/dto/parent-guardian.dto';

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsIn(['M', 'F'])
  sex!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format attendu : YYYY-MM-DD' })
  dateOfBirth!: string;

  @IsString()
  schoolClassId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentGuardianDto)
  parent?: ParentGuardianDto;
}
