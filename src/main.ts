import "reflect-metadata";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useStaticAssets(join(__dirname, "..", "public"));
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle("LLM-bridge API")
    .setDescription("Claude CLI를 HTTP API로 제공하는 브릿지 서버")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = process.env.PORT || 3737;
  await app.listen(port);
  console.log(`LLM-bridge server running on http://localhost:${port}`);
}

bootstrap();