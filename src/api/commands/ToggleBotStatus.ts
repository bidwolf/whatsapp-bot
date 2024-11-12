
import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { GroupMetadata } from '@whiskeysockets/baileys';
import Group from '../models/group.model';
import { COMMAND_PREFIX } from '../../utils/constants';
import { getWhatsAppId } from '../../utils/getWhatsappId';
export default class ToggleBotStatus extends BaseCommand {
  private async toggleBotStatus(groupId: string, isBotEnabled: boolean) {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.enabled = isBotEnabled
      existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
    }
    return false
  }
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
    if (command.groupId) {
      let botStatusArgs = command.args
      if (command.args && typeof command.args === 'object') {
        botStatusArgs = command.args[0]
      }
      if (botStatusArgs === 'on' || botStatusArgs === 'off') {
        const isInviteToggleStatus = await this.toggleBotStatus(command.groupId, botStatusArgs === 'on')
        if (isInviteToggleStatus && message.reply) {
          instance.sendMessage(command.groupId, {
            text: `Bot ${botStatusArgs === 'off' ? 'des' : 'h'}abilitado.`,
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(command.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_habilita o bot no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_desabilita o bot no grupo_)`,
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
    super('bot')
  }
}
