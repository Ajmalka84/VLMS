import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRateDto {
  @IsUUID('4', { message: 'siteId must be a valid UUID' })
  @IsNotEmpty({ message: 'Site is required' })
  siteId!: string;

  @IsUUID('4', { message: 'vehicleTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'Vehicle type is required' })
  vehicleTypeId!: string;

  @IsUUID('4', { message: 'materialTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'Material type is required' })
  materialTypeId!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount!: number;
}
