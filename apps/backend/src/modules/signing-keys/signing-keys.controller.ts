import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { RegisterSigningKeyDto } from '@/modules/signing-keys/dto/register-signing-key.dto';
import { SigningKeysService } from '@/modules/signing-keys/signing-keys.service';

@Controller('signing-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SigningKeysController {
  constructor(private readonly signingKeys: SigningKeysService) {}

  @Post()
  @Roles('ENSEIGNANT', 'SURVEILLANT')
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterSigningKeyDto) {
    return this.signingKeys.registerKey(user.userId, dto.publicKey);
  }
}
