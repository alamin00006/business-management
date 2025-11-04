// src/suppliers/dto/create-supplier.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsPhoneNumber,
  Matches,
} from 'class-validator';

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateSupplierDto {
  @IsString()
  @Matches(/^[A-Z0-9]{3,10}$/, {
    message: 'Supplier code must be 3-10 uppercase letters and numbers',
  })
  supplierCode: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9\s&.,()-]+$/, {
    message:
      'Supplier name can only contain letters, numbers, spaces, and common punctuation',
  })
  name: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GST number format',
  })
  gstNumber?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;
}
