import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser, Role } from '@/modules/auth/types';

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  role: Role;
  schoolId: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const payload: AuthenticatedUser = {
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      schoolId: user.schoolId,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      role: payload.role,
      schoolId: payload.schoolId,
    };
  }
}
