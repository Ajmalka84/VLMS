import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class QueryContractorLedgerDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  endDate?: string;
}
