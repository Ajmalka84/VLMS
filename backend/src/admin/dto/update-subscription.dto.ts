import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsString()
  @IsOptional()
  @IsIn(['TRIAL', 'ANNUAL', 'QUARTERLY', 'CUSTOM'])
  subscriptionPlan?: 'TRIAL' | 'ANNUAL' | 'QUARTERLY' | 'CUSTOM';

  @IsString()
  @IsOptional()
  @IsIn([
    'RENEW_ANNUAL_1Y',
    'RENEW_QUARTERLY_3M',
    'EXTEND_SHUTDOWN_30D',
    'EXTEND_TRIAL_7D',
    'SET_CUSTOM_DATE',
  ])
  action?:
    | 'RENEW_ANNUAL_1Y'
    | 'RENEW_QUARTERLY_3M'
    | 'EXTEND_SHUTDOWN_30D'
    | 'EXTEND_TRIAL_7D'
    | 'SET_CUSTOM_DATE';

  @IsISO8601()
  @IsOptional()
  subscriptionExpiresAt?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  gracePeriodDays?: number;
}
