import { IsBoolean, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateSiteDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Site name must be at least 2 characters' })
  @MaxLength(60, { message: 'Site name cannot exceed 60 characters' })
  siteName?: string;

  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Location must be at least 2 characters' })
  @MaxLength(100, { message: 'Location cannot exceed 100 characters' })
  location?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'Pincode must be a valid 6-digit Indian postal code',
  })
  pincode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
