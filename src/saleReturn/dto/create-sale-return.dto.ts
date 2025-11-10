import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ReturnStatus } from '@prisma/client';

export class CreateSaleReturnDto {
  @IsNumber()
  saleId: number;

  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  reason: string;

  @IsNumber()
  @Min(0)
  refundAmount: number;

  @IsOptional()
  @IsNumber()
  processedById?: number;
}

export class UpdateSaleReturnDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

export class UpdateSaleReturnStatusDto {
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @IsNumber()
  processedById: number;
}

export class ValidateReturnDto {
  @IsNumber()
  saleId: number;

  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}
