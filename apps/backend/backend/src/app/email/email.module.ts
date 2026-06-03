import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DigestService } from './digest.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, DigestService],
  exports: [EmailService],
})
export class EmailModule {}
