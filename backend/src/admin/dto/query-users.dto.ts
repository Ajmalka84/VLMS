import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryUsersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['all', 'active', 'inactive', 'trial', 'active_paid', 'expiring', 'expired'])
  status?: 'all' | 'active' | 'inactive' | 'trial' | 'active_paid' | 'expiring' | 'expired';

  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;
}
