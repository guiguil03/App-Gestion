import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '@/database/prisma.service';
import type { AuthenticatedUser } from '@/modules/auth/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    // Un refresh token partage la même forme de payload qu'un access token
    // (voir types.ts) : sans ce contrôle, il serait accepté ici comme si
    // c'était un access token valide pendant toute sa durée de vie (30j).
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }

    // Vérifié à chaque requête (pas seulement au login) pour qu'une
    // désactivation de compte staff soit immédiate.
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.disabledAt) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
