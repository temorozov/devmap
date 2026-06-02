import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateTreeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;
}
