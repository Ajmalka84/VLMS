import { IsNotEmpty, IsUUID } from 'class-validator';

export class LookupRateDto {
  @IsUUID('4', { message: 'siteId must be a valid UUID' })
  @IsNotEmpty({ message: 'siteId query parameter is required' })
  siteId!: string;

  @IsUUID('4', { message: 'vehicleTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'vehicleTypeId query parameter is required' })
  vehicleTypeId!: string;

  @IsUUID('4', { message: 'materialTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'materialTypeId query parameter is required' })
  materialTypeId!: string;
}
