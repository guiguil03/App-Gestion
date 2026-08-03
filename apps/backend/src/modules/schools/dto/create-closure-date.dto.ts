import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateClosureDateDto {
  @Matches(DATE_PATTERN, { message: 'Format attendu : YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
