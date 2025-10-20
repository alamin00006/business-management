import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
  IsPhoneNumber,
  Matches,
  Min,
} from 'class-validator';
import { UserStatus, Gender } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @Matches(/^[a-zA-Z\s]*$/, {
    message: 'Name can only contain letters and spaces',
  })
  name: string;

  @ApiProperty({
    description: 'Email address (must be unique)',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number (must be unique)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    description: 'Role ID for user permissions',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  roleId: number;

  @ApiPropertyOptional({
    description: 'Branch ID where user is assigned',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({
    description: 'URL to user profile picture',
    example: 'https://example.com/profile.jpg',
  })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiPropertyOptional({
    description: 'User account status',
    enum: UserStatus,
    default: UserStatus.active,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'User gender',
    enum: Gender,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;
}
