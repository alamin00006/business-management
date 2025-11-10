import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsJSON,
  MinLength,
  Matches,
} from 'class-validator';
import { CustomerType, UserStatus } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  customerCode: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Phone number must be valid' })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsJSON()
  address?: any;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  profileCloudinaryId?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Phone number must be valid' })
  phone?: string;

  @IsOptional()
  @IsJSON()
  address?: any;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  profileCloudinaryId?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class LoginCustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}
