import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMaterialTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Material type name is required' })
  name!: string;
}
