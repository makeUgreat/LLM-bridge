import { Module } from "@nestjs/common";
import { PromptController } from "./prompt.controller";
import { ClaudeService } from "./claude.service";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [SessionModule],
  controllers: [PromptController],
  providers: [ClaudeService],
})
export class PromptModule {}