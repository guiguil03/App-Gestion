import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantContext } from '@/common/tenant/tenant-context';
import { SearchService } from '@/modules/search/search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTION', 'ADMIN')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly tenant: TenantContext,
  ) {}

  @Get()
  search(@Query('q') query = '') {
    return this.searchService.search(this.tenant.schoolId, query);
  }
}
