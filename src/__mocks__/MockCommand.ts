import { ICommand } from "../commands";
import { IMessage } from "../messages";
import { MockValidationRunner } from "./MockValidationRunner";

export class MockCommand implements ICommand<IMessage> {
  name: string;
  validationRunner = new MockValidationRunner()
  async run(message: IMessage): Promise<void> { }
  constructor(name: string) {
    this.name = name
  }

}
