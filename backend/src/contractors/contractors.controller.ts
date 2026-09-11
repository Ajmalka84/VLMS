import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ContractorsService } from './contractors.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { CreateContractorPaymentDto } from './dto/create-contractor-payment.dto';
import { QueryContractorPaymentsDto } from './dto/query-contractor-payments.dto';
import { QueryContractorLedgerDto } from './dto/query-contractor-ledger.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('contractors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async create(
    @Request() req: any,
    @Body() dto: CreateContractorDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.create(ownerId, dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async findAll(@Request() req: any) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.findAll(ownerId);
  }

  @Get('summary')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async getSummary(
    @Request() req: any,
    @Query('siteId') siteId?: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.getContractorsSummary(ownerId, siteId);
  }

  @Post('payments')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async createPayment(
    @Request() req: any,
    @Body() dto: CreateContractorPaymentDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.contractorsService.createPayment(ownerId, userId, userRole, dto);
  }

  @Get('payments')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async listPayments(
    @Request() req: any,
    @Query() query: QueryContractorPaymentsDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.listPayments(ownerId, query);
  }

  @Delete('payments/:id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async deletePayment(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.deletePayment(ownerId, id);
  }

  @Get(':id/ledger')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async getLedger(
    @Request() req: any,
    @Param('id') id: string,
    @Query() query: QueryContractorLedgerDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.getContractorLedger(ownerId, id, query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async findOne(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.findOne(ownerId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContractorDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async remove(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.contractorsService.remove(ownerId, id);
  }
}
