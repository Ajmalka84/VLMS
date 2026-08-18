import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsUUID('4', { message: 'vehicleTypeId must be a valid UUID' })
  @IsOptional()
  vehicleTypeId?: string;
}
