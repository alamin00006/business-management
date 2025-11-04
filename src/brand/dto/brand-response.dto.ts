// src/brands/dto/brand-response.dto.ts
import { BrandStatus } from './create-brand.dto';

export class BrandResponseDto {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: BrandStatus;
  createdAt: Date;
  updatedAt: Date;
}
