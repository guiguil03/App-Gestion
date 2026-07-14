import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/database/prisma.module';
import { AbsencesModule } from '@/modules/absences/absences.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CardsModule } from '@/modules/cards/cards.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SchoolsModule } from '@/modules/schools/schools.module';
import { SigningKeysModule } from '@/modules/signing-keys/signing-keys.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { SyncModule } from '@/modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    CardsModule,
    AttendanceModule,
    NotificationsModule,
    SigningKeysModule,
    SyncModule,
    AbsencesModule,
    ClassesModule,
    StaffModule,
    DashboardModule,
  ],
})
export class AppModule {}
