import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVehicleTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Vehicle type name is required' })
  name!: string;
}
