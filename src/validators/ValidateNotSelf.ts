import { CommandValidator, ValidateProps } from '.';
import { ERROR_MESSAGES } from '../utils/constants';
import { sanitizeNumber } from '../utils/conversionHelpers';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class ValidateNotSelf implements CommandValidator {
  async validate({ command, reply }: ValidateProps): Promise<Boolean> {
    if (!command || !command.args || !command.command_executor) return false
    const userNumber = typeof command?.args === 'string' ? command?.args : command?.args.join(' ')
    const whatsappId = getWhatsAppId(sanitizeNumber(userNumber))
    const isSelf = whatsappId === getWhatsAppId(command.command_executor)
    if (isSelf) {
      reply?.(
        ERROR_MESSAGES.SELF_ADM_CHANGE
      );
      return false
    }
    return true
  }
}
