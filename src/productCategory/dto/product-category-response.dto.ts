// src/product-categories/dto/product-category-response.dto.ts
import { CategoryStatus } from './create-product-category.dto';

export class ProductCategoryResponseDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  status: CategoryStatus;
  createdAt: Date;
  updatedAt: Date;
  productCount?: number;
  products?: ProductPreviewDto[];
}

export class ProductPreviewDto {
  id: number;
  name: string;
  slug: string;
  status: string;
  price?: number;
  images?: string[];
}
