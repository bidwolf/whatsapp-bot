import { ICommand, ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { GroupCommunicationSocket } from "../sockets"
import { MockCommand } from "./MockCommand"

export class MockCommandFactory implements ICommandFactory<IMessage> {
  init(message: IMessage, instance: GroupCommunicationSocket): ICommand<IMessage> {
    return new MockCommand(this.commandName)
  }
  getCommandName(): string {
    this.called = true
    return this.commandName
  }
  called = false
  constructor(private readonly commandName: string) { }
}
