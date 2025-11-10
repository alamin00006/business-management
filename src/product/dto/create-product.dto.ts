import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDecimal,
  IsArray,
  IsJSON,
} from 'class-validator';
import { UnitType, Status } from '@prisma/client';

export class CreateProductDto {
  @IsNumber()
  categoryId: number;

  @IsNumber()
  supplierId: number;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  sku: string;

  @IsEnum(UnitType)
  unit: UnitType;

  @IsDecimal()
  costPrice: number;

  @IsDecimal()
  salePrice: number;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsJSON()
  imageUrls?: any;

  @IsOptional()
  @IsJSON()
  imageCloudinaryIds?: any;

  @IsOptional()
  @IsNumber()
  stockAlertQuantity?: number;

  @IsOptional()
  @IsNumber()
  reorderQuantity?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
