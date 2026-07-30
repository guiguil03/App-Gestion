import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import type { AuthenticatedUser } from '@/modules/auth/types';
import { AbsencesService } from '@/modules/absences/absences.service';
import { JustifyAbsenceDto } from '@/modules/absences/dto/justify-absence.dto';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsencesController {
  constructor(
    private readonly absencesService: AbsencesService,
    private readonly tenant: TenantContext,
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
}
