import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { GroupCommunicationSocket } from "../sockets"

export type ICommandRegistry<ISocketMessage extends IMessage> = {
  getFactory: (commandName: string) => Promise<ICommandFactory<ISocketMessage> | undefined>
}
export class CommandRegistry<ISocketMessage extends IMessage> implements ICommandRegistry<ISocketMessage> {
  private commandFactories: Map<string, ICommandFactory<ISocketMessage>> = new Map()
  async getFactory(commandName: string): Promise<ICommandFactory<ISocketMessage> | undefined> {
    if (!this.message.command) {
      throw new Error('command not exists')
    }
    return this.commandFactories.get(commandName)
  }
  constructor(private readonly message: ISocketMessage, private readonly socket: GroupCommunicationSocket
    , private readonly factoryList: ICommandFactory<ISocketMessage>[]) {

    this.registerFactories()
  }
  private registerFactories() {
    this.factoryList.forEach(factory => {
      const command = factory.init({} as ISocketMessage, {} as GroupCommunicationSocket)
      this.commandFactories.set(command.name, factory)
    })
  }
}
