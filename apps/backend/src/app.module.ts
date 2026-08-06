import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/database/prisma.module';
import { AbsencesModule } from '@/modules/absences/absences.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CardsModule } from '@/modules/cards/cards.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { HealthModule } from '@/modules/health/health.module';
import { MediaModule } from '@/modules/media/media.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { ReportsModule } from '@/modules/reports/reports.module';
import { SchoolsModule } from '@/modules/schools/schools.module';
import { SearchModule } from '@/modules/search/search.module';
import { SigningKeysModule } from '@/modules/signing-keys/signing-keys.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { SyncModule } from '@/modules/sync/sync.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Limite générale anti-abus sur toute l'API (indépendante du throttling
    // spécifique aux tentatives de login, voir login-throttle.service.ts).
    // /health et /media sont exemptés via @SkipThrottle (Railway ping le
    // premier en continu, le second est appelé une fois par photo affichée).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    CommonModule,
    PrismaModule,
    HealthModule,
    AuditModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    CardsModule,
    AttendanceModule,
    MediaModule,
    NotificationsModule,
    SigningKeysModule,
    SyncModule,
    AbsencesModule,
    ClassesModule,
    StaffModule,
    DashboardModule,
    AdminModule,
    ReportsModule,
    SearchModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
