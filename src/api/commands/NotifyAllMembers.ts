import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import { getWhatsAppId } from '../../utils/getWhatsappId';
export default class NotifyAllMembers extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    if (!message.command) throw new Error('Command not found')
    const command = message.command
    if (!command.command_executor) throw new Error('Command executor not found')
    const groupMetadata = await this.validateCommand({ method: message.method, command, instance, store })
    if (!groupMetadata) return
    let mentionText = ''
    const mentions = groupMetadata.participants.map(p => {

      mentionText += `@${p.id.split('@')[0]} `
      return p.id
    })
    instance.sendMessage(groupMetadata.id, {
      text: mentionText,
      mentions: mentions
    })

  }
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
  private readonly logger = pino()
  private readonly allowedMethods: Method[] = ['raw']
  constructor() {
    super('all')
  }
}
