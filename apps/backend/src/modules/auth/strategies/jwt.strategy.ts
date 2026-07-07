import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '@/modules/auth/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  validate(payload: AuthenticatedUser): AuthenticatedUser {
    // Un refresh token partage la même forme de payload qu'un access token
    // (voir types.ts) : sans ce contrôle, il serait accepté ici comme si
    // c'était un access token valide pendant toute sa durée de vie (30j).
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
