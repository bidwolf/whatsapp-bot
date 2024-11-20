import { IValidationResult, IValidator } from '.';
import { IMessage } from '../messages';
import { ERROR_MESSAGES } from '../utils/constants';
import { sanitizeNumber } from '../utils/conversionHelpers';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class ValidateParticipantNotSelf<ISocketMessage extends IMessage> implements IValidator<ISocketMessage> {
  async validate(payload: ISocketMessage): Promise<IValidationResult> {
    if (!payload.command || !payload.command.args || !payload.command.command_executor) return { isValid: false, errorMessage: ERROR_MESSAGES.SELF_ADM_RESTRICTED }
    const userNumber = typeof payload.command?.args === 'string' ? payload.command?.args : payload.command?.args.join(' ')
    const whatsappId = getWhatsAppId(sanitizeNumber(userNumber))
    const isSelf = whatsappId === getWhatsAppId(payload.command.command_executor)
    if (isSelf) {
      return { isValid: false, errorMessage: ERROR_MESSAGES.SELF_ADM_RESTRICTED }
    }
    return { isValid: true }
  }
}
