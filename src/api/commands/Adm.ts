import type { GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { BaseCommand, Method, validateCommandProps } from "../../utils/commands";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../class/messageTransformer";
import { TBaileysInMemoryStore } from "../class/BaileysInMemoryStore";
import { sanitizeNumber } from "../../utils/conversionHelpers";
import { getWhatsAppId } from "../../utils/getWhatsappId";
import pino from "pino";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../utils/constants";
/**
 * Adm
 * @description Promote or demote a group member to/from admin
 */
export default class Adm extends BaseCommand {
  private readonly logger = pino()
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    if (!message.command) throw new Error('Command not found')
    const command = message.command
    const { args } = command
    if (!command.command_executor) throw new Error('Command executor not found')
    const groupMetadata = await this.validateCommand({ method: message.method, command, instance, store })
    if (!groupMetadata || !args) return
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber);
      const whatsAppParticipantId = getWhatsAppId(sanitizedNumber);
      const participantExists = groupMetadata.participants.find(
        (p) => p.id === whatsAppParticipantId,
      );
      if (getWhatsAppId(command.command_executor) === whatsAppParticipantId) {
        message.reply(
          ERROR_MESSAGES.SELF_ADM_CHANGE
        );
        return;
      }
      if (!participantExists) {
        message.reply(ERROR_MESSAGES.NOT_FOUND);
        return;
      }
      if (participantExists.admin) {
        const result = await instance.groupParticipantsUpdate(
          groupMetadata.id,
          [whatsAppParticipantId],
          'demote'
        )
        if (result && result.length > 0 && result[0].status == '200') {
          this.logger.info("Participant demoted");
          message.reply(
            SUCCESS_MESSAGES.ADM_DEMOTE
          );
        } else {
          this.logger.info("Participant not demoted");
        }
        return;
      }
      const result = await instance.groupParticipantsUpdate(
        groupMetadata.id,
        [whatsAppParticipantId],
        'promote'
      )
      if (result && result.length > 0 && result[0].status == '200') {
        this.logger.info("Participant promoted");
        message.reply(
          SUCCESS_MESSAGES.ADM_PROMOTE
        );
      } else {
        this.logger.info("Participant not promoted");
      }
    }
  }
  async validateCommand(props: validateCommandProps): Promise<GroupMetadata | null> {
    // First, use the store to fetch the group metadata
    if (!props.command.groupId) {
      throw new Error('Group ID not found')
    }
    if (props.command.command_executor == undefined) {
      throw new Error('Command executor not found')
    }

    const whatsAppId = getWhatsAppId(props.command.command_executor)

    // If the store is not available, use the socket to fetch the group metadata
    const groupMetadata = await props.instance.groupMetadata(props.command.groupId)
    if (!groupMetadata) return null
    const isAdmin = groupMetadata.participants.find(p => p.id === whatsAppId && p.admin)
    if (isAdmin) {
      if (!this.allowedMethods.includes(props.method)) {
        this.logger.info(
          `Method ${props.method} not allowed`
        )
      }
      return this.allowedMethods.includes(props.method) ? groupMetadata : null
    }
    return null
  }
  private readonly allowedMethods: Method[] = ["raw", "reply", "mention"]
  constructor() {
    super(
      "adm"
    )
  }

}
