import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryDashboardDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}
