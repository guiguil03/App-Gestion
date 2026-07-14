import { IsString, MinLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  promotion!: string;
}
