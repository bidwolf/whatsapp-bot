import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { IValidationRunner, IValidationResult, IValidator } from "..";
import { IMessage } from "../../messages";
import { ERROR_MESSAGES } from "../../utils/constants";

export default abstract class ValidationRunner<ISocketMessage extends IMessage> implements IValidationRunner<ISocketMessage> {
  public async runValidations(payload: ISocketMessage, metadata?: GroupMetadata): Promise<IValidationResult> {
    try {
      for (const validator of this.validators) {
        const result = await validator.validate(payload, metadata);
        if (!result.isValid) {
          return result
        }
      }
      return { isValid: true }
    } catch {
      return { isValid: false, errorMessage: ERROR_MESSAGES.UNKNOWN }
    }
  }
  constructor(private readonly validators: IValidator<ISocketMessage>[]) {
  }
}
