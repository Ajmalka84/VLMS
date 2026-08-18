import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMaterialTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Material type name is required' })
  name!: string;
}
