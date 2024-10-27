import type { GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { BaseCommand, Method, validateCommandProps } from "../../utils/commands";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../class/messageTransformer";
import { TBaileysInMemoryStore } from "../class/BaileysInMemoryStore";
import { sanitizeNumber } from "../../utils/conversionHelpers";
import { getWhatsAppId } from "../../utils/getWhatsappId";
import pino from "pino";
import { ERROR_MESSAGES, INVITE_TEMPLATE, SUCCESS_MESSAGES } from "../../utils/constants";
/**
 * Add
 * @description Adds a participant to a group
 */
export default class Add extends BaseCommand {
  private readonly logger = pino()
  async execute(message: ExtendedWAMessageUpdate): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    const groupMetadata = await this.validateCommand({ method: message.method })
    if (!groupMetadata || !this.args) return
    const userNumber = typeof this.args === 'string' ? this.args : this.args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber);
      let newParticipantId = getWhatsAppId(sanitizedNumber);
      if (message.method === 'reply') {
        const vcard =
          message.quoted.vcard || ''
        const phoneNumberMatch = vcard.match(
          /TEL;(?:[^;]*;)*waid=\d+:(\+\d{2} \d{2} \d{4,5}-\d{4})/,
        );
        if (phoneNumberMatch) {
          newParticipantId = getWhatsAppId(sanitizeNumber(phoneNumberMatch[1]));
        } else {
          this.logger.info(
            `No phone number found in vcard reply`
          )
          await message.reply(`${ERROR_MESSAGES.NO_VCARD} para adicionar um novo membro`);
        }
      }
      try {
        this.logger.info(`Adding participant ${newParticipantId} to group ${groupMetadata.id}`)
        const result = await this.instance.groupParticipantsUpdate(
          groupMetadata.id,
          [newParticipantId],
          'add'
        )
        if (result && result.length > 0) {
          if (result[0].status == '200') {
            this.logger.info("Participant added");
            await message.reply(
              SUCCESS_MESSAGES.ADD
            );
          } else if (result[0].status == '403') {
            this.logger.info("Participant not added");
            message.reply(ERROR_MESSAGES.ADD_DIRECTLY);
            const groupInvite = groupMetadata.inviteCode;
            if (groupInvite) {
              await this.instance.sendMessage(
                newParticipantId,
                { text: INVITE_TEMPLATE(groupMetadata.subject, groupInvite) },
              );
            } else {
              const inviteLink = await this.instance.groupInviteCode(
                groupMetadata.id
              )
              if (inviteLink) {
                await this.instance.sendMessage(
                  newParticipantId,
                  { text: INVITE_TEMPLATE(groupMetadata.subject, inviteLink) },
                );
              }
            }
          } else if (result[0].status == '409') {
            this.logger.info("Participant not added");
            await message.reply(
              ERROR_MESSAGES.ALREADY_EXISTS);
          }
        }
      } catch (error) {
        this.logger.error(error)
      }
    }
  }
  async validateCommand(props: validateCommandProps): Promise<GroupMetadata | null> {
    // First, use the store to fetch the group metadata
    if (!this.groupId) {
      throw new Error('Group ID not found')
    }
    if (this.command_executor == undefined) {
      throw new Error('Command executor not found')
    }

    const whatsAppId = getWhatsAppId(this.command_executor)
    if (this.store) {
      const cachedGroupMetadata = await this.store.fetchGroupMetadata(this.groupId, this.instance)
      if (cachedGroupMetadata) {
        const isAdmin = cachedGroupMetadata.participants.find(p => p.id === whatsAppId && p.admin)
        if (isAdmin) {
          return this.allowedMethods.includes(props.method) ? cachedGroupMetadata : null
        }
      }
    } else {
      // If the store is not available, use the socket to fetch the group metadata
      const groupMetadata = await this.instance.groupMetadata(this.groupId)
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
  private readonly allowedMethods: Method[] = ["raw", "reply"]
  constructor(receivedMessage: ExtendedWAMessageUpdate, private readonly instance: ExtendedWaSocket, private readonly store?: TBaileysInMemoryStore) {
    super(
      receivedMessage
    )
  }

}
