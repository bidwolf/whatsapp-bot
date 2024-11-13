import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import { TBaileysInMemoryStore } from '../api/class/BaileysInMemoryStore';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class RevokeLink extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    if (!message.command) throw new Error('Command not found')
    const command = message.command
    if (!command.command_executor) throw new Error('Command executor not found')
    const groupMetadata = await this.validateCommand({ method: message.method, command, instance, store })
    if (!groupMetadata) return
    const inviteCode = await instance.groupRevokeInvite(groupMetadata.id)
    if (inviteCode && message.reply) {
      message.reply('Link do grupo revogado, um novo link foi gerado.')
    }
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
    super('revogar')
  }
}
