import { ICommand, ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { GroupCommunicationSocket } from "../sockets"
import { MockCommand } from "./MockCommand"

export class MockCommandFactory implements ICommandFactory<IMessage> {
  init(message: IMessage, instance: GroupCommunicationSocket): ICommand<IMessage> {
    return this.command
  }
  getCommandName(): string {
    this.called = true
    return this.command.name
  }
  private command: MockCommand
  isCommandRun(): boolean {
    return this.command ? this.command.called : false
  }
  called = false
  constructor(command: MockCommand) {
    this.command = command
  }
}
