import { CommandValidator, ValidateProps } from '.';
import { ERROR_MESSAGES } from '../utils/constants';
import { sanitizeNumber } from '../utils/conversionHelpers';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class ValidateParticipantNotAdmin implements CommandValidator {
  async validate({ metadata, command, reply }: ValidateProps): Promise<Boolean> {
    if (!metadata || !command) return false
    const userNumber = typeof command.args === 'string' ? command.args : command.args.join(' ')

    const participantExists = metadata.participants.find(participant => participant.id === getWhatsAppId(sanitizeNumber(userNumber)))
    if (!participantExists) return false
    if (participantExists.admin) {
      reply?.(ERROR_MESSAGES.BAN_ADMIN)
    }
    return !participantExists.admin
  }
}
