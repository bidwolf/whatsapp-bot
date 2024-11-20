import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { IValidationResult, IValidator } from '.';
import { IMessage } from '../messages';
import { sanitizeNumber } from '../utils/conversionHelpers';
import { getWhatsAppId } from '../utils/getWhatsappId';
import { ERROR_MESSAGES } from '../utils/constants';
export default class ValidateParticipantNotAdmin<ISocketMessage extends IMessage> implements IValidator<ISocketMessage> {
  async validate(payload: ISocketMessage, metadata?: GroupMetadata): Promise<IValidationResult> {
    if (!metadata || !payload.command) return { isValid: false, errorMessage: ERROR_MESSAGES.PARTICIPANT_ADMIN }
    const userNumber = typeof payload.command.args === 'string' ? payload.command.args : payload.command.args.join(' ')
    const participantExists = metadata.participants.find(participant => participant.id === getWhatsAppId(sanitizeNumber(userNumber)))
    if (!participantExists || participantExists.admin) {
      return { isValid: false, errorMessage: ERROR_MESSAGES.PARTICIPANT_ADMIN }
    }
    return { isValid: !participantExists.admin }
  }
}
