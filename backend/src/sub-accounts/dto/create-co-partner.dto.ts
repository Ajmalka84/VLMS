import {
  IsArray,
  IsNotEmpty,
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

export class PartnerSiteShareInputDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsNumber()
  @Min(0.01)
  @Max(100.0)
  sharePercentage!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'effectiveFrom must be in YYYY-MM-DD format' })
  effectiveFrom?: string;
}

export class CreateCoPartnerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Mobile number must be exactly 10 digits' })
  mobile!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartnerSiteShareInputDto)
  siteShares!: PartnerSiteShareInputDto[];
}
