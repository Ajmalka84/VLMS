import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePartnerSiteShareInputDto {
  @IsString()
  siteId!: string;

  @IsNumber()
  @Min(0.0)
  @Max(100.0)
  sharePercentage!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveFrom must be in YYYY-MM-DD format' })
  effectiveFrom?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCoPartnerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePartnerSiteShareInputDto)
  siteShares?: UpdatePartnerSiteShareInputDto[];
}
