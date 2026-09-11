import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum PaymentModeDto {
  CASH_DRAWER = 'CASH_DRAWER',
  VENDOR_CREDIT = 'VENDOR_CREDIT',
  OWNER_DIRECT = 'OWNER_DIRECT',
  CO_PARTNER_DIRECT = 'CO_PARTNER_DIRECT',
}

export class CreateExpenseDto {
  @IsUUID()
  @IsNotEmpty()
  siteId!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsISO8601({ strict: true })
  @IsNotEmpty()
  date!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentModeDto)
  paymentMode?: PaymentModeDto;

  @IsOptional()
  @IsUUID()
  payerPartnerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  transferMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paidTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;

  // Machinery Hourly Rental Fields
  @IsOptional()
  @IsUUID()
  machineryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  closingTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  startMeterReading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  endMeterReading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rentPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advanceAmount?: number;
}
