import { ApiProperty } from '@nestjs/swagger';

export class SyncPromptResponseDto {
  @ApiProperty({ description: 'LLM 응답 텍스트', example: 'Hello! How can I help?' })
  text!: string;

  @ApiProperty({ description: '실행 실패 시 에러 메시지', nullable: true, example: null })
  error!: string | null;

  @ApiProperty({ description: 'CLI 프로세스 종료 코드', nullable: true, example: 0 })
  exitCode!: number | null;
}
