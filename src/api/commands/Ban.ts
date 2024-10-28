import type { GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { BaseCommand, Method, validateCommandProps } from "../../utils/commands";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../class/messageTransformer";
import { TBaileysInMemoryStore } from "../class/BaileysInMemoryStore";
import { sanitizeNumber } from "../../utils/conversionHelpers";
import { getWhatsAppId } from "../../utils/getWhatsappId";
import pino from "pino";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../utils/constants";

/**
 * Ban
 * @description Ban a user from a group
 * @author Bidwolf
 */
export default class Ban extends BaseCommand {
  private readonly logger = pino()
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    if (!message.command) throw new Error('Command not found')
    const command = message.command
    const { args } = command
    const groupMetadata = await this.validateCommand({ method: message.method, command, instance, store })
    if (!groupMetadata || !args) return
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber)
      const participant = groupMetadata.participants.find(p => p.id === getWhatsAppId(sanitizedNumber))
      if (!participant) {
        this.logger.info(
          `User ${sanitizedNumber} not found in group ${groupMetadata.id}`
        )
        await message.reply(ERROR_MESSAGES.NOT_FOUND)
        return
      }
      if (participant.admin) {
        this.logger.info(
          `Cannot ban admin ${sanitizedNumber}`
        )
        await message.reply(ERROR_MESSAGES.BAN_ADMIN)
        return
      }
      const result = await instance.groupParticipantsUpdate(
        groupMetadata.id,
        [getWhatsAppId(sanitizedNumber)],
        'remove'
      )
      if (result && result.length > 0 && result[0].status == '200') {
        this.logger.info("Participant removed");
        await message.reply(SUCCESS_MESSAGES.BAN);
      } else {
        this.logger.info("Participant not removed");
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
    if (props.store) {
      const cachedGroupMetadata = await props.store.fetchGroupMetadata(props.command.groupId, props.instance)
      if (cachedGroupMetadata) {
        const isAdmin = cachedGroupMetadata.participants.find(p => p.id === whatsAppId && p.admin)
        if (isAdmin) {
          return this.allowedMethods.includes(props.method) ? cachedGroupMetadata : null
        }
      }
    } else {
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
    }
    return null
  }
  private readonly allowedMethods: Method[] = ["mention", "reply"]
  constructor() {
    super(
      "ban"
    )
  }

}
