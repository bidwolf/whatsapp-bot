import { IValidationResult, IValidator } from ".";
import { IMessage } from "../messages";
import { Method } from "../utils/commands";
import { ERROR_MESSAGES } from "../utils/constants";

export default class ValidateMethods<ISocketMessage extends IMessage> implements IValidator<ISocketMessage> {
  async validate(payload: ISocketMessage): Promise<IValidationResult> {
    const isValid = payload.method ? this.allowedMethods.includes(payload.method) : false
    return { isValid, errorMessage: isValid ? undefined : ERROR_MESSAGES.METHOD_NOT_ALLOWED }
  }
  constructor(private readonly allowedMethods: Method[]) { }
}
