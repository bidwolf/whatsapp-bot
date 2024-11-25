import { ICommand } from "../commands"
import { IMessage } from "../messages"
import { GroupCommunicationSocket } from "../sockets"
import { ICommandRegistry } from "./CommandRegistry"

export type ICommandInitializer<ISocketMessage extends IMessage> = {
  initializeCommand: (message: ISocketMessage) => ICommand<ISocketMessage> | undefined
}
export class CommandInitializer<ISocketMessage extends IMessage> implements ICommandInitializer<ISocketMessage> {
  initializeCommand(message: ISocketMessage): ICommand<ISocketMessage> | undefined {
    try {
      if (!message.command?.command_name) {
        return undefined
      }
      const factory = this.registry.getFactory(message.command?.command_name)
      if (!factory) {
        return undefined
      }
      const command = factory.init(message, this.socket)
      return command
    } catch (error) {

    }
  }
  constructor(private readonly registry: ICommandRegistry<ISocketMessage>, private readonly socket: GroupCommunicationSocket) { }
}
