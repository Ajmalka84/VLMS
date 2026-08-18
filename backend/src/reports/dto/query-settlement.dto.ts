import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class QuerySettlementDto {
  @IsUUID('4', { message: 'contractorId must be a valid UUID' })
  @IsNotEmpty({ message: 'Contractor is required' })
  contractorId!: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsUUID('4')
  @IsOptional()
  siteId?: string;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsUUID('4')
  @IsOptional()
  customerId?: string;
}
