import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryReorderItemDto {
  @IsInt()
  id: number;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class CategoryReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryReorderItemDto)
  categories: CategoryReorderItemDto[];
}
