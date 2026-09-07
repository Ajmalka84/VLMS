import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
