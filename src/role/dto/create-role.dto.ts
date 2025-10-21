import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name (must be unique)',
    example: 'store_manager',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message:
      'Role name can only contain letters, numbers, and underscores, and must start with a letter or underscore',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manages store operations and inventory',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Role permissions in JSON format',
    example: {
      users: ['read', 'create'],
      products: ['read', 'create', 'update', 'delete'],
    },
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}
