import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service'; // Add this line
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService], // Add PrismaService here
})
export class AppModule {}