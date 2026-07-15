import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser, Role } from '@/modules/auth/types';

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  role: Role;
  schoolId: string | null;
  studentId: string | null;
};

type TokenSubject = Omit<AuthenticatedUser, 'type'>;

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

    return this.issueTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      schoolId: user.schoolId,
      studentId: user.studentId,
    });
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    let payload: AuthenticatedUser;
    try {
      payload = await this.jwtService.verifyAsync<AuthenticatedUser>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    return this.issueTokenPair({
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      schoolId: payload.schoolId,
      studentId: payload.studentId,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private issueTokenPair(subject: TokenSubject): LoginResult {
    return {
      accessToken: this.jwtService.sign({ ...subject, type: 'access' }, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign({ ...subject, type: 'refresh' }, { expiresIn: '30d' }),
      role: subject.role,
      schoolId: subject.schoolId,
      studentId: subject.studentId,
    };
  }
}
