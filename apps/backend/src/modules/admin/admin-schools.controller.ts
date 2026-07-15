import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AdminSchoolsService } from '@/modules/admin/admin-schools.service';
import { CreateSchoolDto } from '@/modules/admin/dto/create-school.dto';

@Controller('admin/schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSchoolsController {
  constructor(private readonly adminSchoolsService: AdminSchoolsService) {}

  @Get()
  list() {
    return this.adminSchoolsService.list();
  }

  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.adminSchoolsService.create(dto);
  }
}
