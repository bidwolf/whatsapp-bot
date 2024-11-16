import { BaseCommand } from "../utils/commands";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../utils/messageTransformer";
import { sanitizeNumber } from "../utils/conversionHelpers";
import { getWhatsAppId } from "../utils/getWhatsappId";
import pino from "pino";
import { SUCCESS_MESSAGES } from "../utils/constants";
import ValidateExecutorAdmin from "../validators/ValidateExecutorAdmin";
import ValidateMethods from "../validators/ValidateMethods";
import ValidateParticipantNotSelf from "../validators/ValidateParticipantNotSelf";
import ValidateParticipantExists from "../validators/ValidateParticipantExists";
import ValidationRunner from "../validators/ValidationRunner";
/**
 * Adm
 * @description Promote or demote a group member to/from admin
 */
export default class Adm extends BaseCommand {
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
      const sanitizedNumber = sanitizeNumber(userNumber);
      const whatsAppParticipantId = getWhatsAppId(sanitizedNumber);
      const shouldDemote = groupMetadata.participants.find(participant => participant.id === whatsAppParticipantId)?.admin
      const result = await instance.groupParticipantsUpdate(
        groupMetadata.id,
        [whatsAppParticipantId],
        shouldDemote ? 'demote' : 'promote'
      )
      if (result && result.length > 0 && result[0].status == '200') {
        this.logger.info(shouldDemote ? "Participant demoted" : "Participant promoted");
        message.reply(
          shouldDemote ? SUCCESS_MESSAGES.ADM_DEMOTE : SUCCESS_MESSAGES.ADM_PROMOTE
        );
      } else {
        this.logger.info(shouldDemote ? "Participant not demoted" : "Participant not promoted");
      }
      return;
    }
  }
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw', 'reply', 'mention'])
    const participantExistsValidator = new ValidateParticipantExists()
    const notSelfValidator = new ValidateParticipantNotSelf()
    super(
      "adm",
      new ValidationRunner([adminValidator, methodValidator, participantExistsValidator, notSelfValidator])
    )
  }

}
