import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import { GroupMetadata } from '@whiskeysockets/baileys';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class Rename extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const { command, method } = message
    if (!command) {
      throw new Error('Command not found')
    }
    if (!method) {
      throw new Error('Method not found')
    }
    const groupMetadata = await this.validateCommand({ command, method, instance })
    if (!groupMetadata) {
      return
    }
    if (command.args && typeof command.args === 'string') {
      const description = command.args
      instance.groupUpdateSubject(groupMetadata.id, description)
    } else if (command.args && typeof command.args === 'object') {
      const description = command.args.join(' ')
      instance.groupUpdateSubject(groupMetadata.id, description)
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
    super('nome')
  }
}
