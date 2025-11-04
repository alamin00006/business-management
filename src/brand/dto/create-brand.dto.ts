import { IsString, IsOptional, IsEnum, IsUrl, Matches } from 'class-validator';

export enum BrandStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateBrandDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9\s&-]+$/, {
    message:
      'Brand name can only contain letters, numbers, spaces, hyphens, and ampersands',
  })
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  logo?: string;

  @IsEnum(BrandStatus)
  @IsOptional()
  status?: BrandStatus;
}
