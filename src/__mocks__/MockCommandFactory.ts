import { ICommand, ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { GroupCommunicationSocket } from "../sockets"
import { MockCommand } from "./MockCommand"

export class MockCommandFactory implements ICommandFactory<IMessage> {
  init(message: IMessage, instance: GroupCommunicationSocket): ICommand<IMessage> {
    return new MockCommand(this.commandName)
  }
  constructor(private readonly commandName: string) { }
}
