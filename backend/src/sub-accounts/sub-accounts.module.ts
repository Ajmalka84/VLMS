import { Module } from '@nestjs/common';
import { SubAccountsController } from './sub-accounts.controller';
import { SubAccountsService } from './sub-accounts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubAccountsController],
  providers: [SubAccountsService],
  exports: [SubAccountsService],
})
export class SubAccountsModule {}
