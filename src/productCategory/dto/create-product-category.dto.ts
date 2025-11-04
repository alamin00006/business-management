import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateProductCategoryDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9\s&-]+$/, {
    message:
      'Category name can only contain letters, numbers, spaces, hyphens, and ampersands',
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
  icon?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
