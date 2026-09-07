import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryMachinerySettlementDto {
  @IsUUID('4')
  @IsOptional()
  machineryId?: string;

  @IsUUID('4')
  @IsOptional()
  siteId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsUUID('4')
  @IsOptional()
  customerId?: string;
}
