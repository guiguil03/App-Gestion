import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthenticatedUser } from '@/modules/auth/types';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(
    @Inject(REQUEST) private readonly request: Request & { user?: AuthenticatedUser },
  ) {}

  get user(): AuthenticatedUser {
    if (!this.request.user) {
      throw new Error('TenantContext accédé en dehors d\'une requête authentifiée');
    }
    return this.request.user;
  }

  /** À utiliser uniquement pour les rôles scopés à une école (tout sauf ADMIN). */
  get schoolId(): string {
    const { schoolId } = this.user;
    if (!schoolId) {
      throw new Error('TenantContext accédé par un utilisateur sans école (ADMIN)');
    }
    return schoolId;
  }
}
