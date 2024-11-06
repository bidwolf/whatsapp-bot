import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import Group from '../models/group.model';
import { getWhatsAppId } from '../../utils/getWhatsappId';
import { sanitizeNumber } from '../../utils/conversionHelpers';

export default class UnmuteCommand extends BaseCommand {
  private readonly logger = pino()
  private readonly allowedMethods: Method[] = ['reply', 'mention']
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
  async unmuteUser(groupId: string, userJid: string): Promise<boolean> {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return false;
      }
      if (!existentGroup.blackListedUsers) {
        existentGroup.blackListedUsers = []
      }
      if (!existentGroup.blackListedUsers.includes(userJid)) {
        return true
      }
      existentGroup.blackListedUsers.filter(u => u !== userJid)
      existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
      return false
    }
  }
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    const { command, method } = message
    if (!command || !command.groupId) {
      throw new Error('Command not found')
    }
    if (!method) {
      throw new Error('Method not found')
    }
    const groupMetadata = await this.validateCommand({ command, method, instance, store })
    if (!groupMetadata) {
      return
    }
    const { args } = command
    if (!args) {
      throw new Error('Args not found')
    }
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber)
      const participant = groupMetadata.participants.find(p => p.id === getWhatsAppId(sanitizedNumber))
      if (!participant) {
        this.logger.info(
          `User ${sanitizedNumber} not found in group ${groupMetadata.id}`
        )
        message.reply('Usuário não encontrado.')
        return
      }
      if (participant.admin) {
        this.logger.info(
          `Cannot unmute admin ${sanitizedNumber}`
        )
        return
      }
      const isUserUnmuted = await this.unmuteUser(command.groupId, getWhatsAppId(sanitizedNumber))
      if (isUserUnmuted) {
        this.logger.info("Participant unmuted");
        message.reply('Usuário agora pode enviar mensagens livremente.')
        return
      } else {
        this.logger.info("Participant not unmuted");
      }
    }
  }
  constructor() {
    super('desmute')
  }
}
