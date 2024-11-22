import { IValidationResult, IValidator } from '.';
import { IMessage } from '../messages';
import { sanitizeNumber } from '../utils/conversionHelpers';
import { getWhatsAppId } from '../utils/getWhatsappId';
import { ERROR_MESSAGES } from '../utils/constants';
export default class ValidateParticipantExists<ISocketMessage extends IMessage> implements IValidator<ISocketMessage> {
  async validate(payload: ISocketMessage): Promise<IValidationResult> {
    if (!payload.groupMetadata || !payload.command || !payload.command.args) return { isValid: false, errorMessage: ERROR_MESSAGES.NOT_FOUND }
    const userNumber = typeof payload.command.args === 'string' ? payload.command.args : payload.command.args.join(' ')
    const sanitizedNumber = sanitizeNumber(userNumber);
    const whatsAppParticipantId = getWhatsAppId(sanitizedNumber);
    const participantExists = payload.groupMetadata.participants.find(participant => participant.id === whatsAppParticipantId)
    if (participantExists) {
      return { isValid: true }
    }
    return { isValid: false, errorMessage: ERROR_MESSAGES.NOT_FOUND }
  }
}
