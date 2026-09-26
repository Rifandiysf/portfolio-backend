import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateExperienceDto {
  @IsString() role!: string;
  @IsString() companyName!: string;
  @IsString() date!: string;
  @IsString() description!: string;
  @IsArray() @IsString({ each: true }) techStack!: string[];
  @IsOptional() @IsInt() order?: number;
}
