import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { IMessage } from "../messages"


export type IValidationRunner<ISocketMessage extends IMessage> = {
  runValidations: (payload: ISocketMessage, metadata?: GroupMetadata) => Promise<IValidationResult>
}
export type IValidator<ISocketMessage extends IMessage> = {
  validate: (payload: ISocketMessage, metadata?: GroupMetadata) => Promise<IValidationResult>
}
export type IValidationResult = {
  isValid: Boolean;
  errorMessage?: string
}
