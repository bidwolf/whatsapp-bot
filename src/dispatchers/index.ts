import { type Logger } from "pino"
import { ICommand, ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { GroupCommunicationSocket } from "../sockets"

export type ICommandDispatcher = {
  dispatchCommand: () => Promise<void>
}
export class CommandDispatcher<ISocketMessage extends IMessage> implements ICommandDispatcher {
  public async dispatchCommand(): Promise<void> {
    const inputCommand = this.message.command
    if (!inputCommand || !inputCommand.groupId) {
      this.logger.info('No command found in message')
      return
    }
    const foundCommand = this.commands.get(inputCommand.command_name)
    if (!foundCommand) return
    try {
      await foundCommand.run(this.message)
    } catch (e) {
      this.logger.error(e)
    }
  }
  private commands: Map<string, ICommand<ISocketMessage>> = new Map()
  private registerCommands() {
    this.availableCommands.forEach(factory => {
      const command = factory.init(this.message, this.socket)
      this.commands.set(command.name, command)
    })
  }
  constructor(private readonly socket: GroupCommunicationSocket, private readonly message: ISocketMessage, private readonly availableCommands: ICommandFactory<ISocketMessage>[], private readonly logger: Logger) {
    this.registerCommands()
  }
}
