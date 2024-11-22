import { IMessage } from "../messages"


export type IValidationRunner<ISocketMessage extends IMessage> = {
  runValidations: (payload: ISocketMessage) => Promise<IValidationResult>
}
export type IValidator<ISocketMessage extends IMessage> = {
  validate: (payload: ISocketMessage) => Promise<IValidationResult>
}
export type IValidationResult = {
  isValid: Boolean;
  errorMessage?: string
}
