import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AuthService } from '@/modules/auth/auth.service';
import { ChangePasswordDto } from '@/modules/auth/dto/change-password.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { RefreshDto } from '@/modules/auth/dto/refresh.dto';
import { RegisterPushTokenDto } from '@/modules/auth/dto/register-push-token.dto';
import { UpdateNotificationEmailDto } from '@/modules/auth/dto/update-notification-email.dto';
import type { AuthenticatedUser } from '@/modules/auth/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  registerPushToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterPushTokenDto) {
    return this.authService.registerPushToken(user.userId, dto.expoPushToken);
  }

  // Email volontaire pour recevoir le rapport hebdomadaire automatique — voir
  // WeeklyReportJob. Réservé à DIRECTION/ADMIN : seuls ces rôles sont
  // destinataires du rapport.
  @Post('notification-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DIRECTION', 'ADMIN')
  @HttpCode(200)
  updateNotificationEmail(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationEmailDto) {
    return this.authService.updateNotificationEmail(user.userId, dto.email);
  }
}
