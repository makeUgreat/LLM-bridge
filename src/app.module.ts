import {Module} from "@nestjs/common";
import {SessionModule} from "./session/session.module";
import {PromptModule} from "./prompt/prompt.module";

@Module({
  imports: [SessionModule, PromptModule],
})
export class AppModule {}