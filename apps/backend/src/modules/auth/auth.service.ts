import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '@/database/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { LoginThrottleService } from '@/modules/auth/login-throttle.service';
import type { AuthenticatedUser, Role } from '@/modules/auth/types';

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  role: Role;
  schoolId: string | null;
  studentId: string | null;
  mustChangePassword: boolean;
};

type TokenSubject = Omit<AuthenticatedUser, 'type'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    this.loginThrottle.assertNotLocked(username);

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      this.loginThrottle.registerFailure(username);
      await this.audit.log({
        action: 'auth.login.failure',
        username,
        metadata: { reason: user ? 'wrong_password' : 'unknown_username' },
      });
      throw new UnauthorizedException('Identifiants incorrects');
    }

    this.loginThrottle.reset(username);
    await this.audit.log({
      schoolId: user.schoolId,
      userId: user.id,
      username: user.username,
      role: user.role,
      action: 'auth.login.success',
    });

    return this.issueTokenPair({
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      schoolId: user.schoolId,
      studentId: user.studentId,
      mustChangePassword: user.mustChangePassword,
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
      mustChangePassword: payload.mustChangePassword,
    });
  }

  /**
   * Change le mot de passe et réémet une paire de jetons à jour (plutôt que
   * `void`) : c'est le seul moyen pour l'app mobile d'obtenir immédiatement
   * un jeton avec `mustChangePassword: false` sans repasser par un login —
   * indispensable pour l'écran de changement forcé (cf. StudentsService
   * provisionAccount/provisionParentAccount), qui doit pouvoir quitter cet
   * écran dans la foulée du changement.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return this.issueTokenPair({
      userId: updated.id,
      username: updated.username,
      role: updated.role as Role,
      schoolId: updated.schoolId,
      studentId: updated.studentId,
      mustChangePassword: updated.mustChangePassword,
    });
  }

  /**
   * Enregistre/remplace le jeton Expo Push de l'appareil courant — appelé
   * par l'app mobile à chaque connexion réussie (le jeton peut changer d'une
   * installation à l'autre). Un seul jeton par compte (cf. commentaire sur
   * `User.expoPushToken`) : une connexion sur un nouvel appareil remplace
   * simplement l'ancien, pas de gestion multi-appareils pour l'instant.
   */
  async registerPushToken(userId: string, expoPushToken: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { expoPushToken } });
  }

  // Email volontaire pour recevoir le rapport hebdomadaire automatique — voir
  // WeeklyReportJob. Aucun rôle vérifié ici (déjà fait par le controller) :
  // le champ existe pour tout compte, seul WeeklyReportJob le filtre par rôle.
  async updateNotificationEmail(userId: string, email: string): Promise<{ email: string }> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { email } });
    return { email: user.email! };
  }

  private issueTokenPair(subject: TokenSubject): LoginResult {
    return {
      accessToken: this.jwtService.sign({ ...subject, type: 'access' }, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign({ ...subject, type: 'refresh' }, { expiresIn: '30d' }),
      role: subject.role,
      schoolId: subject.schoolId,
      studentId: subject.studentId,
      mustChangePassword: subject.mustChangePassword,
    };
  }
}
