import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateVehicleTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Vehicle type name is required' })
  name!: string;
}
