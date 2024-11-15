import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { getWhatsAppId } from '../utils/getWhatsappId';

export default class BlockCommand extends BaseCommand {
  private readonly logger = pino()
  private readonly allowedMethods: Method[] = ['raw']
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
  async blockCommand(groupId: string, command: string): Promise<boolean> {
    try {
      if (command === 'on' || command === 'off' || command === 'bot') {
        return false
      }
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return false;
      }
      if (!existentGroup.blockedCommands) {
        existentGroup.blockedCommands = []
      }
      if (existentGroup.blockedCommands.includes(command)) {
        return true
      }
      existentGroup.blockedCommands.push(command)
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
    let commandToBlock = args
    if (command.args && typeof command.args === 'object') {
      commandToBlock = command.args[0]
    }
    const isCommandBlocked = await this.blockCommand(command.groupId, commandToBlock)
    if (isCommandBlocked) {
      if (message.reply) {
        message.reply(`Comando ${commandToBlock} bloqueado com sucesso`)
      }
      return
    }
  }
  constructor() {
    super('off')
  }
}
