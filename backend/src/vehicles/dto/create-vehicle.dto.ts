import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'Vehicle number is required' })
  vehicleNumber!: string;

  @IsUUID('4', { message: 'vehicleTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'Vehicle type is required' })
  vehicleTypeId!: string;
}
