import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateNodeDto {
  @IsString()
  treeId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsNumber()
  positionX!: number;

  @IsNumber()
  positionY!: number;

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
