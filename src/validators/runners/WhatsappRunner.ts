import ValidationRunner from ".";
import { IValidator } from "..";
import { WhatsAppMessage } from "../../messages/WhatsappMessage";

export class WhatsappValidationRunner extends ValidationRunner<WhatsAppMessage> {
  constructor(validations: IValidator<WhatsAppMessage>[]) {
    super(validations)
  }
}
