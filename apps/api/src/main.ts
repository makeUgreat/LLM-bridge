import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@platform/nest/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3737;
  await app.listen(port);
  console.log(`LLM-bridge server running on http://localhost:${port}`);
}

void bootstrap();
