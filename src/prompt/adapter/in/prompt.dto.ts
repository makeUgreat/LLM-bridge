import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class PromptDto {
  @ApiProperty({ description: 'LLM에 보낼 프롬프트 텍스트', example: 'Explain hexagonal architecture' })
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ description: 'LLM 모델 식별자', example: 'claude-sonnet-4-20250514' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'CLI 실행 작업 디렉토리', example: '/home/user/project' })
  @IsOptional()
  @IsString()
  workingDir?: string;

  @ApiPropertyOptional({ description: '도구 사용 권한 모드', example: 'plan' })
  @IsOptional()
  @IsString()
  permissionMode?: string;

  @ApiPropertyOptional({ description: '허용할 도구 이름 목록', example: ['Read', 'Grep', 'Glob'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTools?: string[];

  @ApiPropertyOptional({ description: '시스템 프롬프트 오버라이드' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
