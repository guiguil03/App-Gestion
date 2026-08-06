import { IsEmail } from 'class-validator';

export class UpdateNotificationEmailDto {
  @IsEmail()
  email!: string;
}
