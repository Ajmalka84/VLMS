import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateVehicleTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Vehicle type name is required' })
  @MinLength(2, { message: 'Vehicle type name must be at least 2 characters' })
  @MaxLength(40, { message: 'Vehicle type name cannot exceed 40 characters' })
  name!: string;
}
