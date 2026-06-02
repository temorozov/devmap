import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

export class BatchDescriptionsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  nodeIds?: string[];
}
