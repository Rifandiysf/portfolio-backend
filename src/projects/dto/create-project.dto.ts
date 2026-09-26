import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateProjectDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsString() image!: string;
  @IsArray() @IsString({ each: true }) images!: string[];
  @IsArray() @IsString({ each: true }) status!: string[];
  @IsInt() year!: number;
  @IsOptional() @IsUrl() liveUrl?: string;
  @IsOptional() @IsUrl() githubUrl?: string;
  @IsArray() @IsString({ each: true }) techStack!: string[];
  @IsArray() @IsString({ each: true }) features!: string[];
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() solution?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
