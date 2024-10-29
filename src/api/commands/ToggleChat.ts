import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { COMMAND_PREFIX } from '../../utils/constants';
export default class ToggleChat extends BaseCommand {
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
    let toggleCommandArgs = command.args
    if (command.args && typeof command.args === 'object') {
      toggleCommandArgs = command.args[0]
    }
    if (toggleCommandArgs === 'on') {
      instance.groupSettingUpdate(groupMetadata.id, 'not_announcement')
      return
    }
    if (toggleCommandArgs === 'off') {
      instance.groupSettingUpdate(groupMetadata.id, 'announcement')
      return
    }
    if (message.reply) {
      this.logger.info('No args found or invalid args')
      message.reply(`Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_permite que todos enviem mensagens no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_somente administradores podem enviar mensagens no grupo_)`)
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
    if (props.store) {
      const groupMetadata = await props.store.fetchGroupMetadata(props.command.groupId, props.instance)
      if (groupMetadata) {
        const isAdmin = groupMetadata.participants.find(p => p.id === props.command.command_executor)?.admin
        if (isAdmin) {
          const isAllowed = this.allowedMethods.includes(props.method)
          this.logger.info(`Method ${isAllowed ? '' : 'not'} allowed for user ${props.command.command_executor}`)
          return isAllowed ? groupMetadata : null
        }
      }
    } else {

      const groupMetadata = await props.instance.groupMetadata(props.command.groupId)
      if (!groupMetadata) {
        throw new Error('Group metadata not found')
      }
      const isAdmin = groupMetadata.participants.find(p => p.id === props.command.command_executor)?.admin
      if (!isAdmin) {
        const isAllowed = this.allowedMethods.includes(props.method)
        this.logger.info(`Method ${isAllowed ? '' : 'not'} allowed for user ${props.command.command_executor}`)
        return isAllowed ? groupMetadata : null
      }
      return null
    }
    return null
  }
  constructor() {
    super('chat')
  }
}
