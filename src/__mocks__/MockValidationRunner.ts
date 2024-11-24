import { IMessage } from "../messages";
import { IValidationResult, IValidationRunner } from "../validators";

export class MockValidationRunner implements IValidationRunner<IMessage> {
  async runValidations(payload: IMessage): Promise<IValidationResult> {
    return { isValid: true }
  }

}
