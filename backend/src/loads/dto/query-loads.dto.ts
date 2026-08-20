import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class QueryLoadsDto {
  @IsUUID('4')
  @IsOptional()
  siteId?: string;

  @IsUUID('4')
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  contractorId?: string;

  @IsUUID('4')
  @IsOptional()
  materialTypeId?: string;

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit: number = 20;
}
