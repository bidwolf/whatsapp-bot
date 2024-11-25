import { ICommandFactory } from "../commands";
import { ICommandRegistry } from "../dispatchers/CommandRegistry";
import { IMessage } from "../messages";

export class MockCommandRegistry implements ICommandRegistry<IMessage> {
  getFactory(commandName: string): ICommandFactory<IMessage> | undefined {
    this.called = true
    return this.factoryList.find(c => c.getCommandName() === commandName)
  }
  called = false
  constructor(private readonly factoryList: ICommandFactory<IMessage>[]) { }
}
