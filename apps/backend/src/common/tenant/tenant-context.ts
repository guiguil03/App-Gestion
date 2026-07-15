import { ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
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

  /**
   * École sur laquelle porte la requête. Pour tout rôle scopé nativement à
   * une école, c'est celle de son propre compte. Un compte ADMIN n'a pas
   * d'école propre (vue transverse, cf. AdminModule) : sur les routes
   * école-scopées (dashboard, classes, staff, absences...) il doit préciser
   * l'école visée via l'en-tête `x-school-id` — c'est ce qui permet à
   * apps/dashboard de réutiliser telles quelles les mêmes routes que
   * DIRECTION quand un ADMIN "entre" dans une école (voir schools settings).
   */
  get schoolId(): string {
    const { schoolId, role } = this.user;

    if (role === 'ADMIN') {
      const header = this.request.headers['x-school-id'];
      const headerSchoolId = Array.isArray(header) ? header[0] : header;
      if (!headerSchoolId) {
        throw new ForbiddenException("En-tête x-school-id requis pour un compte ADMIN sur cette route");
      }
      return headerSchoolId;
    }

    if (!schoolId) {
      throw new Error('TenantContext accédé par un utilisateur sans école');
    }
    return schoolId;
  }
}
