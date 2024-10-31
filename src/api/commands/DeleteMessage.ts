import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import { getWhatsAppId } from '../../utils/getWhatsappId';
export default class DeleteMessage extends BaseCommand {
  private readonly logger = pino()
  private readonly allowedMethods: Method[] = ['reply']
  async validateCommand(props: validateCommandProps): Promise<GroupMetadata | null> {
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
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    if (!message.command) throw new Error('Command not found')
    const command = message.command
    if (!command.command_executor) throw new Error('Command executor not found')
    const groupMetadata = await this.validateCommand({ method: message.method, command, instance, store })
    if (!groupMetadata) return
    if (message.getQuotedMessage) {
      const quotedMessage = await message.getQuotedMessage()
      if (quotedMessage && quotedMessage.delete) {
        quotedMessage.delete()
      }
    }
  }
  constructor() {
    super('del')
  }
}
