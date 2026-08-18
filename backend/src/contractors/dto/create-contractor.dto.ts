import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateContractorDto {
  @IsString()
  @IsNotEmpty({ message: 'Contractor name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must be a valid 10-digit number',
  })
  mobile!: string;
}
