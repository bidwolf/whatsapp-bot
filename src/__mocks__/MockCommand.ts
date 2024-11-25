import { ICommand } from "../commands";
import { IMessage } from "../messages";
import { MockValidationRunner } from "./MockValidationRunner";

export class MockCommand implements ICommand<IMessage> {
  name: string;
  validationRunner = new MockValidationRunner()
  async run(message: IMessage): Promise<void> {
    this.called = true
    if (this.isErrorExpected) {
      throw new Error('command error')
    }
  }
  called = false
  private isErrorExpected: boolean = false
  shouldThrow(isErrorExpected: boolean) {
    this.isErrorExpected = isErrorExpected
  }
  constructor(name: string) {
    this.name = name
  }

}
