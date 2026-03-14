import { IsArray, IsOptional, IsString } from 'class-validator';

export class PromptDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  workingDir?: string;

  @IsOptional()
  @IsString()
  permissionMode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTools?: string[];

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
