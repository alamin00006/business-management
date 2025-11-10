import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export class SaleItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  total: number;
}

export class CreateSaleDto {
  @IsNumber()
  branchId: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsString()
  invoiceNo: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  createdById: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}

export class UpdatePaymentDto {
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class UpdateStatusDto {
  @IsEnum(SaleStatus)
  status: SaleStatus;
}
