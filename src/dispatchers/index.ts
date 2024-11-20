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
    if (!inputCommand || !inputCommand.groupId) return
    const foundCommand = this.commands.get(inputCommand.command_name)
    if (!foundCommand) return
    try {
      const metadata = await this.socket.getMetadata(inputCommand.groupId)
      if (!metadata) {
        this.logger.error('Não foram encontradas informações sobre esse grupo')
        return
      }
      await foundCommand.run(this.message, metadata)
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
