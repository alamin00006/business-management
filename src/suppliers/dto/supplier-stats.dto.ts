// src/suppliers/dto/supplier-stats.dto.ts
export class SupplierStatsResponseDto {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  suppliersWithProducts: number;
  topSuppliers: TopSupplierDto[];
}

export class TopSupplierDto {
  id: number;
  name: string;
  supplierCode: string;
  productCount: number;
  totalPurchaseAmount: number;
}
