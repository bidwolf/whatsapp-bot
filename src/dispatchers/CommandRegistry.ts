import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"

export type ICommandRegistry<ISocketMessage extends IMessage> = {
  getFactory: (commandName: string) => ICommandFactory<ISocketMessage> | undefined
}
export class CommandRegistry<ISocketMessage extends IMessage> implements ICommandRegistry<ISocketMessage> {
  private commandFactories: Map<string, ICommandFactory<ISocketMessage>> = new Map()
  getFactory(commandName: string): ICommandFactory<ISocketMessage> | undefined {
    return this.commandFactories.get(commandName)
  }
  constructor(private readonly factoryList: ICommandFactory<ISocketMessage>[]) {

    this.registerFactories()
  }
  private registerFactories() {
    this.factoryList.forEach(factory => {
      const commandName = factory.getCommandName()
      this.commandFactories.set(commandName, factory)
    })
  }
}
