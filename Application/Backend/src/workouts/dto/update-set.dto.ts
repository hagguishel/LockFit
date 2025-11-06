import { IsInt, IsNumber, IsOptional, Min, Max, } from 'class-validator';
import { Transform } from 'class-transformer';

const toNumberOrNul = ({ value }: { value: any}) =>
  value ===  null ? null : (value === '' || value === undefined ? undefined: Number(value));
export class UpdatesetDto {
  @IsOptional()
   @Transform(toNumberOrNul)
   @IsInt()
   @Min(0)
  reps?: number;

  @IsOptional()
   @Transform(toNumberOrNul)
   @IsNumber()
   @Min(0)
  weight?: number | null;

  @IsOptional()
   @Transform(toNumberOrNul)
   @IsNumber()
   @Min(1)
   @Max(10)
   rpe?: number | null;

  @IsOptional()
   @Transform(toNumberOrNul)
    @IsInt()
    @Min(0)
  rest?: number | null;
}
