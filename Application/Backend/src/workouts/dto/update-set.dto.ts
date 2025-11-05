import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatesetDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  reps?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  weight?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  rpe?: number | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  rest?: number | null;
}
