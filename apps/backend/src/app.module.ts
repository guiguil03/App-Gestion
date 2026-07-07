import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/database/prisma.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CardsModule } from '@/modules/cards/cards.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SchoolsModule } from '@/modules/schools/schools.module';
import { StudentsModule } from '@/modules/students/students.module';
import { SyncModule } from '@/modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    CommonModule,
    PrismaModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    CardsModule,
    AttendanceModule,
    NotificationsModule,
    SyncModule,
  ],
})
export class AppModule {}
