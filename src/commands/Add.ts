import { BaseCommand } from "../utils/commands";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../utils/messageTransformer";
import { sanitizeNumber } from "../utils/conversionHelpers";
import { getWhatsAppId } from "../utils/getWhatsappId";
import pino from "pino";
import { ERROR_MESSAGES, INVITE_TEMPLATE, SUCCESS_MESSAGES } from "../utils/constants";
import ValidateMethods from "../validators/ValidateMethods";
import ValidateExecutorAdmin from "../validators/ValidateExecutorAdmin";
import ValidateNumber from "../validators/ValidateNumber";
import ValidationRunner from "../validators/ValidationRunner";
/**
 * Add
 * @description Adds a participant to a group
 */
export default class Add extends BaseCommand {
  private readonly logger = pino()
  private getVcard(vcard?: string): string {
    if (!vcard) return ''
    const phoneNumberMatch = vcard.match(
      /TEL;(?:[^;]*;)*waid=\d+:(\+\d{2} \d{2} \d{4,5}-\d{4})/,
    );
    return phoneNumberMatch ? getWhatsAppId(sanitizeNumber(phoneNumberMatch[1])) : ''
  }
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

    if (!groupMetadata || !args) return
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber);
      let newParticipantId = getWhatsAppId(sanitizedNumber);
      if (message.method === 'reply') {
        newParticipantId = this.getVcard(message.quoted.vcard)
        if (!newParticipantId) {
          this.logger.info(
            `No phone number found in vcard reply`
          )
          message.reply(ERROR_MESSAGES.NO_VCARD);
          return
        }
      }
      try {
        this.logger.info(`Adding participant ${newParticipantId} to group ${groupMetadata.id}`)
        const result = await instance.groupParticipantsUpdate(
          groupMetadata.id,
          [newParticipantId],
          'add'
        )
        if (result && result.length > 0) {
          if (result[0].status == '200') {
            this.logger.info("Participant added");
            message.reply(
              SUCCESS_MESSAGES.ADD
            );
          } else if (result[0].status == '403') {
            this.logger.info("Participant not added");
            message.reply(ERROR_MESSAGES.ADD_DIRECTLY);
            const groupInvite = groupMetadata.inviteCode;
            if (groupInvite) {
              await instance.sendMessage(
                newParticipantId,
                { text: INVITE_TEMPLATE(groupMetadata.subject, groupInvite) },
              );
            } else {
              const inviteLink = await instance.groupInviteCode(
                groupMetadata.id
              )
              if (inviteLink) {
                await instance.sendMessage(
                  newParticipantId,
                  { text: INVITE_TEMPLATE(groupMetadata.subject, inviteLink) },
                );
              }
            }
          } else if (result[0].status == '409') {
            this.logger.info("Participant not added");
            message.reply(
              ERROR_MESSAGES.ALREADY_EXISTS);
          }
        }
      } catch (error) {
        this.logger.error(error)
      }
    }
  }

  constructor() {
    const methodValidator = new ValidateMethods(["raw", "reply"])
    const adminValidator = new ValidateExecutorAdmin()
    const validateNumber = new ValidateNumber()
    super("add", new ValidationRunner([adminValidator, methodValidator, validateNumber]))
  }

}
