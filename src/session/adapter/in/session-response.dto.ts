import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionResponseDto {
  @ApiProperty({ description: '세션 고유 식별자', example: '550e8400-e29b-41d4-a716-446655440000' })
  sessionId!: string;

  @ApiProperty({ description: '세션 생성 시각' })
  createdAt!: Date;
}

export class DeleteSessionResponseDto {
  @ApiProperty({ description: '삭제 성공 여부', example: true })
  deleted!: boolean;
}

export class SessionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ nullable: true, example: null })
  claudeSessionId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  lastUsedAt!: Date;
}
