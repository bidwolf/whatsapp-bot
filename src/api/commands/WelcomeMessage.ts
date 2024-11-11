import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { getWhatsAppId } from '../../utils/getWhatsappId';
import Group from '../models/group.model';
export default class WelcomeMessage extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    const { command, method } = message
    if (!command) {
      throw new Error('Command not found')
    }
    if (!method) {
      throw new Error('Method not found')
    }
    const groupMetadata = await this.validateCommand({ command, method, instance, store })
    if (!groupMetadata) {
      return
    }
    if (command.args && typeof command.args === 'string') {
      const welcomeMessage = command.args
      this.updateWelcomeMessage(groupMetadata.id, welcomeMessage)
      message.reply?.(`Mensagem de boas-vindas atualizada com sucesso`)
    } else if (command.args && typeof command.args === 'object') {
      const welcomeMessage = command.args.join(' ')
      this.updateWelcomeMessage(groupMetadata.id, welcomeMessage)
      message.reply?.(`Mensagem de boas-vindas atualizada com sucesso`)
    }
  }
  private async updateWelcomeMessage(groupId: string, welcomeMessage: string) {
    try {
      const group = await Group.findOne({ groupId: groupId }).exec()
      if (!group) {
        this.logger.info("Group not found")
        return
      }
      group.welcomeMessage = welcomeMessage
      group.save()
    } catch (error) {
      this.logger.error(`Error updating welcome message: ${error}`)
    }
  }
  private readonly logger = pino()
  private readonly allowedMethods: Method[] = ['raw']
  async validateCommand(props: validateCommandProps): Promise<GroupMetadata | null> {
    if (!props.command.groupId) {
      throw new Error('Group ID not found')
    }
    if (!props.command.command_executor) {
      throw new Error('Command executor not found')
    }
    const whatsAppId = getWhatsAppId(props.command.command_executor)
    const groupMetadata = await props.instance.groupMetadata(props.command.groupId)
    if (!groupMetadata) {
      throw new Error('Group metadata not found')
    }
    const isAdmin = groupMetadata.participants.find(p => p.id === whatsAppId)?.admin
    if (isAdmin) {
      const isAllowed = this.allowedMethods.includes(props.method)
      this.logger.info(`Method ${isAllowed ? '' : 'not'} allowed for user ${whatsAppId}`)
      return isAllowed ? groupMetadata : null
    }
    return null
  }
  constructor() {
    super('msg')
  }
}
