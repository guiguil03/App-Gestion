import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSchoolProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  directorName?: string | null;
}
