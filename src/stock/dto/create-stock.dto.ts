import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateStockDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  branchId: number;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class UpdateStockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}

export class AdjustStockDto {
  @IsNumber()
  @Min(1)
  quantity: number;
}
