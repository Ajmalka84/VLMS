import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryContractorSummaryDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsUUID('4')
  @IsOptional()
  siteId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID('4')
  @IsOptional()
  customerId?: string;
}
