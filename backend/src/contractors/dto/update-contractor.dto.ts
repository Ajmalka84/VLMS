import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateContractorDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Contractor name must be at least 2 characters' })
  @MaxLength(60, { message: 'Contractor name cannot exceed 60 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must be a valid 10-digit mobile number',
  })
  mobile?: string;
}
