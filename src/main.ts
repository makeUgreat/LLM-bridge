import "reflect-metadata";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useStaticAssets(join(__dirname, "..", "public"));
  app.enableShutdownHooks();

  const port = process.env.PORT || 3737;
  await app.listen(port);
  console.log(`LLM-bridge server running on http://localhost:${port}`);

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();