import { IsOptional, IsString } from 'class-validator';

export class ApproveShiftDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
