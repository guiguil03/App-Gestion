import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { ClassesService } from '@/modules/classes/classes.service';
import { CreateClassDto } from '@/modules/classes/dto/create-class.dto';
import { UpdateClassDto } from '@/modules/classes/dto/update-class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  @Roles('DIRECTION', 'ADMIN')
  list() {
    return this.classesService.list(this.tenant.schoolId);
  }

  @Post()
  @Roles('DIRECTION', 'ADMIN')
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto, this.tenant.schoolId);
  }

  @Patch(':classId')
  @Roles('DIRECTION', 'ADMIN')
  update(@Param('classId') classId: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(classId, dto, this.tenant.schoolId);
  }

  @Delete(':classId')
  @Roles('DIRECTION', 'ADMIN')
  remove(@Param('classId') classId: string) {
    return this.classesService.remove(classId, this.tenant.schoolId);
  }

  @Post(':classId/teachers/:userId')
  @Roles('DIRECTION', 'ADMIN')
  assignTeacher(@Param('classId') classId: string, @Param('userId') userId: string) {
    return this.classesService.assignTeacher(classId, userId, this.tenant.schoolId);
  }

  @Delete(':classId/teachers/:userId')
  @Roles('DIRECTION', 'ADMIN')
  unassignTeacher(@Param('classId') classId: string, @Param('userId') userId: string) {
    return this.classesService.unassignTeacher(classId, userId, this.tenant.schoolId);
  }
}
