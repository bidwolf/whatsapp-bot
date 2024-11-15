
import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import { GroupMetadata } from '@whiskeysockets/baileys';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class ToggleBrazilianOnly extends BaseCommand {
  private async toggleBrazilOnly(groupId: string, onlyBrazil: boolean) {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.onlyBrazil = onlyBrazil
      existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
    }
    return false
  }
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
    if (command.groupId) {
      let enableGringosArg = command.args
      if (command.args && typeof command.args === 'object') {
        enableGringosArg = command.args[0]
      }
      if (enableGringosArg === 'on' || enableGringosArg === 'off') {
        const isGringoEnabledStatus = await this.toggleBrazilOnly(command.groupId, enableGringosArg === 'off') // if gringos are enabled, then, onlyBrazil is false
        if (isGringoEnabledStatus && message.reply) {
          instance.sendMessage(command.groupId, {
            text: `Os estrangeiros ${enableGringosArg === 'on' ? '' : 'não'} podem entrar nesse grupo`,
            viewOnce: true,
            time: 86400
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(command.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_desabilita a entrada de estrangeiros no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_permite a entrada de estrangeiros no grupo_)`,
          viewOnce: true,
          time: 86400
        })
      }
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
    super('gringo')
  }
}
