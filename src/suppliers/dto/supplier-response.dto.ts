import { SupplierStatus } from './create-supplier.dto';

export class SupplierResponseDto {
  id: number;
  supplierCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  paymentTerms?: string;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
  purchaseCount?: number;
  products?: SupplierProductDto[];
  recentPurchases?: SupplierPurchaseDto[];
}

export class SupplierProductDto {
  id: number;
  name: string;
  sku: string;
  status: string;
  price: number;
}

export class SupplierPurchaseDto {
  id: number;
  purchaseNumber: string;
  totalAmount: number;
  status: string;
  purchaseDate: Date;
}
