import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentModeDto } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentModeDto)
  paymentMode?: PaymentModeDto;

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
