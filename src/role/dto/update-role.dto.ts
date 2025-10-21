import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiPropertyOptional({
    description: 'Role permissions in JSON format',
    example: {
      users: ['read', 'create', 'update'],
      products: ['read', 'create', 'update', 'delete'],
    },
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}
