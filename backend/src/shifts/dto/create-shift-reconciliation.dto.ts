import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateShiftReconciliationDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @IsOptional()
  @IsString()
  shiftType?: string;

  @IsNumber()
  @Min(0, { message: 'Actual handover cash must be positive or zero' })
  actualHandoverCash!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
