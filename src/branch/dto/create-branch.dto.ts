import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from '@prisma/client'; // assuming you have a Prisma enum called Status

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerId?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
