import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty({ message: 'Site name is required' })
  siteName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location!: string;

  @IsString()
  @IsNotEmpty({ message: 'Pincode is required' })
  pincode!: string;
}
