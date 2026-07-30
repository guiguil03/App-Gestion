import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { AuditService } from '@/modules/audit/audit.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { AbsencesService } from '@/modules/absences/absences.service';
import { JustifyAbsenceDto } from '@/modules/absences/dto/justify-absence.dto';
import { JustifyAbsencesBulkDto } from '@/modules/absences/dto/justify-absences-bulk.dto';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(
    private readonly absencesService: AbsencesService,
    private readonly tenant: TenantContext,
    private readonly audit: AuditService,
  ) {}

  // Rétro-compatible : sans `page`, renvoie le tableau complet comme avant
  // (utilisé par la fiche élève via `studentId`). Avec `page`, bascule sur
  // la pagination + recherche serveur (page Absences du dashboard).
  @Get()
  @Roles('DIRECTION', 'ADMIN')
  list(
    @Query('schoolClassId') schoolClassId?: string,
    @Query('studentId') studentId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    if (page === undefined) {
      return this.absencesService.list(this.tenant.schoolId, schoolClassId, studentId);
    }
    return this.absencesService.listPaginated(this.tenant.schoolId, {
      schoolClassId,
      search,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 25)),
    });
  }

  @Patch(':absenceId/justify')
  @Roles('DIRECTION', 'ADMIN', 'PARENT')
  justify(
    @Param('absenceId') absenceId: string,
    @Body() dto: JustifyAbsenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.absencesService.justify(absenceId, this.tenant.schoolId, dto.reason, user);
  }

  // Justification groupée depuis la page Absences du dashboard (sélection
  // multiple + un seul motif) — pas de cas d'usage PARENT, contrairement à
  // la justification unitaire ci-dessus.
  @Patch('justify-bulk')
  @Roles('DIRECTION', 'ADMIN')
  async justifyBulk(@Body() dto: JustifyAbsencesBulkDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.absencesService.justifyBulk(dto.absenceIds, this.tenant.schoolId, dto.reason);
    await this.audit.log({
      schoolId: this.tenant.schoolId,
      userId: user.userId,
      username: user.username,
      role: user.role,
      action: 'absences.justify_bulk',
      targetType: 'absence',
      metadata: { count: result.count, requested: dto.absenceIds.length, reason: dto.reason },
    });
    return result;
  }
}
