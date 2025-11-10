import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class InitializeLoyaltyDto {
  @IsNumber()
  customerId: number;
}

export class AddPointsDto {
  @IsNumber()
  @Min(1)
  points: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  referenceId?: number;
}

export class RedeemPointsDto {
  @IsNumber()
  @Min(1)
  points: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  referenceId?: number;
}

export class AdjustPointsDto {
  @IsNumber()
  points: number;

  @IsString()
  reason: string;
}

export class ResetAccountDto {
  @IsString()
  reason: string;
}
