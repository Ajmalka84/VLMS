import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class CreateLoadDto {
  @IsUUID('4', { message: 'siteId must be a valid UUID' })
  @IsNotEmpty({ message: 'Site is required' })
  siteId!: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsUUID('4', { message: 'vehicleId must be a valid UUID' })
  @IsNotEmpty({ message: 'Vehicle is required' })
  vehicleId!: string;

  @IsUUID('4', { message: 'materialTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'Material type is required' })
  materialTypeId!: string;

  @IsUUID('4', { message: 'contractorId must be a valid UUID' })
  @IsNotEmpty({ message: 'Contractor is required' })
  contractorId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount?: number;

  @IsEnum(PaymentType, {
    message: 'paymentType must be either CASH or CREDIT',
  })
  @IsNotEmpty({ message: 'Payment type is required' })
  paymentType!: PaymentType;
}
