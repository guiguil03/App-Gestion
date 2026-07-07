import { Controller, Param, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { StudentsService } from '@/modules/students/students.service';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly tenant: TenantContext,
  ) {}

  // Retourne le mot de passe en clair une seule fois : à noter/transmettre
  // immédiatement par la direction, non récupérable ensuite.
  @Post(':studentId/account')
  @Roles('DIRECTION')
  provisionAccount(@Param('studentId') studentId: string) {
    return this.studentsService.provisionAccount(studentId, this.tenant.schoolId);
  }
}
