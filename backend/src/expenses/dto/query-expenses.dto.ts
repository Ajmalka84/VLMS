import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentModeDto } from './create-expense.dto';

export class QueryExpensesDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  machineryId?: string;

  @IsOptional()
  @IsEnum(PaymentModeDto)
  paymentMode?: PaymentModeDto;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
