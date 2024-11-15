import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import Group from '../api/models/group.model';
import { getWhatsAppId } from '../utils/getWhatsappId';
import { sanitizeNumber } from '../utils/conversionHelpers';

export default class MuteCommand extends BaseCommand {
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
  async muteUser(groupId: string, userJid: string): Promise<boolean> {
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
      if (existentGroup.blackListedUsers.includes(userJid)) {
        return true
      }
      existentGroup.blackListedUsers.push(userJid)
      existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
      return false
    }
  }
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const { command, method } = message
    if (!command || !command.groupId) {
      throw new Error('Command not found')
    }
    if (!method) {
      throw new Error('Method not found')
    }
    const groupMetadata = await this.validateCommand({ command, method, instance })
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
          `Cannot mute admin ${sanitizedNumber}`
        )
        message.reply('Não é possível silenciar um administrador.')
        return
      }
      const isUserSilenced = await this.muteUser(command.groupId, getWhatsAppId(sanitizedNumber))
      if (isUserSilenced) {
        this.logger.info("Participant muted");
        message.reply('Usuário silenciado com sucesso.')
        return
      } else {
        this.logger.info("Participant not muted");
      }
    }
  }
  constructor() {
    super('mute')
  }
}
