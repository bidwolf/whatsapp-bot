
import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';
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
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = await this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) return
    if (message.command?.groupId) {
      let toggleNSFWArgs = message.command?.args
      if (message.command?.args && typeof message.command?.args === 'object') {
        toggleNSFWArgs = message.command?.args[0]
      }
      if (toggleNSFWArgs === 'on' || toggleNSFWArgs === 'off') {
        const isQueryNSFWSuccessful = await this.toggleBotStatus(message.command?.groupId, toggleNSFWArgs === 'off') // if antiPorn is off, allowNSFW is true
        if (isQueryNSFWSuccessful && message.reply) {
          instance.sendMessage(message.command?.groupId, {
            text: `Conteúdo impróprio ${toggleNSFWArgs === 'on' ? 'des' : 'h'}abilitado.`,
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(message.command?.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_Proíbe conteúdo impróprio no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_Permite o envio de conteúdo impróprio no grupo_)`,
        })
      }
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('antiporn', new ValidationRunner([adminValidator, methodValidator]))
  }
}
