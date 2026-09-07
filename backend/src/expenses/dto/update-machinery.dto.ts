import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateMachineryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultRentPerHour?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vendorMobile?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
