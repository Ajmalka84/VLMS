import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateContractorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must be a valid 10-digit number',
  })
  mobile?: string;
}
