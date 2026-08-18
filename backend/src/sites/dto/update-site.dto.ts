import { IsOptional, IsString } from 'class-validator';

export class UpdateSiteDto {
  @IsString()
  @IsOptional()
  siteName?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  pincode?: string;
}
