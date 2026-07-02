import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { SessionModule } from '@contexts/session/session.module';
import { PromptModule } from '@contexts/prompt/prompt.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

@Module({
  imports: [SessionModule, PromptModule],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
