import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateSchoolEventDto {
  @Matches(DATE_PATTERN, { message: 'Format attendu : YYYY-MM-DD' })
  date!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
