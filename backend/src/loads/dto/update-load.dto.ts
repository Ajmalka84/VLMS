import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class UpdateLoadDto {
  @IsUUID('4', { message: 'siteId must be a valid UUID' })
  @IsOptional()
  siteId?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsUUID('4', { message: 'vehicleId must be a valid UUID' })
  @IsOptional()
  vehicleId?: string;

  @IsUUID('4', { message: 'materialTypeId must be a valid UUID' })
  @IsOptional()
  materialTypeId?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '' && value !== undefined)
  @IsUUID('4', { message: 'contractorId must be a valid UUID' })
  contractorId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount?: number;

  @IsEnum(PaymentType, {
    message: 'paymentType must be either CASH or CREDIT',
  })
  @IsOptional()
  paymentType?: PaymentType;
}
