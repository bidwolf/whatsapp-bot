import { IValidationResult, IValidator } from '.';
import Group from '../models/group.model';
import { IMessage } from '../messages';
import { ERROR_MESSAGES } from '../utils/constants';
import { isBrazilianNumber, sanitizeNumber } from '../utils/conversionHelpers';
export default class ValidateNumber<ISocketMessage extends IMessage> implements IValidator<ISocketMessage> {
  async validate(payload: ISocketMessage): Promise<IValidationResult> {
    if (!payload.command || !payload.command.groupId || !payload.command.args) return { isValid: false, errorMessage: ERROR_MESSAGES.INVALID_NUMBER }
    const group = await Group.findOne({ groupId: payload.command.groupId })
    if (!group) return { isValid: false, errorMessage: ERROR_MESSAGES.UNKNOWN }
    const userNumber = typeof payload.command.args === 'string' ? payload.command.args : payload.command.args.join(' ')
    if (group.onlyBrazil) {
      const isFromBrazil = isBrazilianNumber(userNumber)
      if (isFromBrazil) {
        return { isValid: true }
      }
      return { isValid: false, errorMessage: ERROR_MESSAGES.BRAZIL_ONLY }
    }
    const sanitized = sanitizeNumber(userNumber)
    const isValid = sanitized.length >= 8 && sanitized.length <= 15
    if (isValid) {
      return { isValid: true }
    }
    return { isValid: false, errorMessage: ERROR_MESSAGES.INVALID_NUMBER }
  }
}
