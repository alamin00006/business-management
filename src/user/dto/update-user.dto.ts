import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsEmail, IsPhoneNumber, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'Email address (must be unique if provided)',
    example: 'new.email@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number (must be unique if provided)',
    example: '+1987654321',
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'New password (min 6 characters)',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsOptional()
  @MinLength(6)
  password?: string;
}
