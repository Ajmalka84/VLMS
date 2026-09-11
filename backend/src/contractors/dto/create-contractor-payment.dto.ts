import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentModeDto } from '../../expenses/dto/create-expense.dto';

export class CreateContractorPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  siteId!: string;

  @IsUUID()
  @IsNotEmpty()
  contractorId!: string;

  @IsISO8601({ strict: true })
  @IsNotEmpty()
  date!: string;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @IsOptional()
  @IsEnum(PaymentModeDto)
  paymentMode?: PaymentModeDto;

  @IsOptional()
  @IsUUID()
  collectedByUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  transferMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}
