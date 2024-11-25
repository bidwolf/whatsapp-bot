import { type Logger } from "pino"
import { IMessage } from "../messages"
import { ICommandInitializer } from "./commandInitializer"

export type ICommandDispatcher = {
  dispatchCommand: () => Promise<void>
}
export class CommandDispatcher<ISocketMessage extends IMessage> implements ICommandDispatcher {
  public async dispatchCommand(): Promise<void> {
    try {
      const foundCommand = this.initializer.initializeCommand(this.message)
      if (!foundCommand) {
        this.logger.info('No command found in message')
        return
      }
      await foundCommand.run(this.message)
    } catch (e) {
      this.logger.error(e)
    }
  }
  constructor(private readonly message: ISocketMessage, private readonly initializer: ICommandInitializer<ISocketMessage>, private readonly logger: Logger) { }
}
