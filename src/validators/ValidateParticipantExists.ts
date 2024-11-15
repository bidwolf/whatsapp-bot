import { CommandValidator, ValidateProps } from '.';
import { ERROR_MESSAGES } from '../utils/constants';
import { sanitizeNumber } from '../utils/conversionHelpers';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class ValidateParticipantExists implements CommandValidator {
  async validate({ reply, metadata, command }: ValidateProps): Promise<Boolean> {
    if (!metadata || !command || !command.args) return false
    const userNumber = typeof command.args === 'string' ? command.args : command.args.join(' ')

    const sanitizedNumber = sanitizeNumber(userNumber);
    const whatsAppParticipantId = getWhatsAppId(sanitizedNumber);
    const participantExists = metadata.participants.find(participant => participant.id === whatsAppParticipantId)
    if (participantExists) {
      return true
    }
    reply?.(ERROR_MESSAGES.NOT_FOUND);
    return false
  }
}
