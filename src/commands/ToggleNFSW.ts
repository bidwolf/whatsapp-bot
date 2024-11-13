
import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../utils/commands';
import { TBaileysInMemoryStore } from '../api/class/BaileysInMemoryStore';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import { GroupMetadata } from '@whiskeysockets/baileys';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import { getWhatsAppId } from '../utils/getWhatsappId';
export default class ToggleNSFW extends BaseCommand {
  private async toggleBotStatus(groupId: string, isNSFWEnabled: boolean) { //NSFW = Not Safe For Work
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.allowNSFW = isNSFWEnabled
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
      let toggleNSFWArgs = command.args
      if (command.args && typeof command.args === 'object') {
        toggleNSFWArgs = command.args[0]
      }
      if (toggleNSFWArgs === 'on' || toggleNSFWArgs === 'off') {
        const isQueryNSFWSuccessful = await this.toggleBotStatus(command.groupId, toggleNSFWArgs === 'off') // if antiPorn is off, allowNSFW is true
        if (isQueryNSFWSuccessful && message.reply) {
          instance.sendMessage(command.groupId, {
            text: `Conteúdo impróprio ${toggleNSFWArgs === 'on' ? 'des' : 'h'}abilitado.`,
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(command.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_Proíbe conteúdo impróprio no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_Permite o envio de conteúdo impróprio no grupo_)`,
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
    super('antiporn')
  }
}
