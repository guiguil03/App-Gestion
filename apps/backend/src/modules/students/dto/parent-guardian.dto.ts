import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { NotificationChannel } from '@prisma/client';

const PHONE_PATTERN = /^\+?[0-9 ]{8,15}$/;

export class ParentGuardianDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  relationship!: string;

  @Matches(PHONE_PATTERN, { message: 'Numéro de téléphone invalide' })
  phoneNumber!: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: 'Numéro de téléphone secondaire invalide' })
  secondaryPhoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  notificationChannel?: NotificationChannel;
}
