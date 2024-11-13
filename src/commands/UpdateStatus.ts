import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { TBaileysInMemoryStore } from '../api/class/BaileysInMemoryStore';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import { GroupMetadata } from '@whiskeysockets/baileys';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class UpdateStatus extends BaseCommand {
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
      const status = command.args
      await instance.updateProfileStatus(status)
      const test = await instance.fetchStatus(instance.user?.id || '')
      console.log(test)
    } else if (command.args && typeof command.args === 'object') {
      const status = command.args.join(' ')
      await instance.updateProfileStatus(status)
      const test = await instance.fetchStatus(getWhatsAppId(instance.user?.id || ''))
      console.log(test)
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
    super('status')
  }
}
