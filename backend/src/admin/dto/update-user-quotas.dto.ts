import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateUserQuotasDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  coPartnerQuota?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  siteBoyQuota?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsString()
  paymentRef?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
