import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  positionY?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
