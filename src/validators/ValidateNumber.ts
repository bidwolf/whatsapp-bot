import { CommandValidator, ValidateProps } from '.';
import Group from '../api/models/group.model';
import { ERROR_MESSAGES } from '../utils/constants';
import { isBrazilianNumber, sanitizeNumber } from '../utils/conversionHelpers';
export default class ValidateNumber implements CommandValidator {
  async validate({ command, reply }: ValidateProps): Promise<Boolean> {
    if (!command || !command.groupId || !command.args) return false
    const group = await Group.findOne({ groupId: command.groupId })
    if (!group) return false
    const userNumber = typeof command.args === 'string' ? command.args : command.args.join(' ')
    if (group.onlyBrazil) {
      const isFromBrazil = isBrazilianNumber(userNumber)
      if (isFromBrazil) {
        return true
      }
      reply?.(ERROR_MESSAGES.BRAZIL_ONLY)
      return false
    }
    const sanitized = sanitizeNumber(userNumber)
    const isValid = sanitized.length >= 8 && sanitized.length <= 15
    if (isValid) {
      return true
    }
    return false
  }
}
