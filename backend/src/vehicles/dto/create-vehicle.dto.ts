import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'Vehicle number is required' })
  @Matches(/^[A-Za-z0-9]{4,15}$/, {
    message: 'Vehicle number must contain 4 to 15 alphanumeric characters only (no spaces or special characters)',
  })
  vehicleNumber!: string;

  @IsUUID('4', { message: 'vehicleTypeId must be a valid UUID' })
  @IsNotEmpty({ message: 'Vehicle type is required' })
  vehicleTypeId!: string;
}
