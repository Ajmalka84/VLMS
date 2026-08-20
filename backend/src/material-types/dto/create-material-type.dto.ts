import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateMaterialTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Material type name is required' })
  @MinLength(2, { message: 'Material type name must be at least 2 characters' })
  @MaxLength(40, { message: 'Material type name cannot exceed 40 characters' })
  name!: string;
}
