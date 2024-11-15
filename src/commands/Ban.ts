import { BaseCommand } from "../utils/commands";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../utils/messageTransformer";
import { sanitizeNumber } from "../utils/conversionHelpers";
import { getWhatsAppId } from "../utils/getWhatsappId";
import pino from "pino";
import { SUCCESS_MESSAGES } from "../utils/constants";
import ValidateMethods from "../validators/ValidateMethods";
import ValidateExecutorAdmin from "../validators/ValidateExecutorAdmin";
import ValidateNumber from "../validators/ValidateNumber";
import ValidationRunner from "../validators/ValidationRunner";
import ValidateParticipantNotAdmin from "../validators/ValidateParticipantNotAdmin";
import ValidateParticipantNotSelf from "../validators/ValidateParticipantNotSelf";

/**
 * Ban
 * @description Ban a user from a group
 * @author Bidwolf
 */
export default class Ban extends BaseCommand {
  private readonly logger = pino()
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = await this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) return
    const args = message.command?.args
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber)
      const result = await instance.groupParticipantsUpdate(
        groupMetadata.id,
        [getWhatsAppId(sanitizedNumber)],
        'remove'
      )
      if (result && result.length > 0 && result[0].status == '200') {
        this.logger.info("Participant removed");
        message.reply(SUCCESS_MESSAGES.BAN);
      } else {
        this.logger.info("Participant not removed");
      }
    }
  }
  constructor() {
    const methodValidator = new ValidateMethods(["mention", "reply"])
    const adminValidator = new ValidateExecutorAdmin()
    const validateNumber = new ValidateNumber()
    const participantNotAdmin = new ValidateParticipantNotAdmin()
    const participantNotSelf = new ValidateParticipantNotSelf()
    super(
      "ban",
      new ValidationRunner([methodValidator, adminValidator, validateNumber, participantNotAdmin, participantNotSelf])
    )
  }

}
