import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsDate,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentStatus, PurchaseStatus } from '@prisma/client';

export class PurchaseItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsNumber()
  @Min(0)
  total: number;
}

export class CreatePurchaseDto {
  @IsNumber()
  supplierId: number;

  @IsNumber()
  branchId: number;

  @IsString()
  invoiceNo: string;

  @IsDate()
  @Type(() => Date)
  purchaseDate: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsNumber()
  createdById: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class UpdatePurchaseStatusDto {
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
