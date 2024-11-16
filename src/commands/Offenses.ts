
import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class Offenses extends BaseCommand {
  private async toggleAllowOffenses(groupId: string, turnOn: boolean) {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.allowOffenses = turnOn
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
      let toggleCommandArgs = message.command?.args
      if (message.command?.args && typeof message.command?.args === 'object') {
        toggleCommandArgs = message.command?.args[0]
      }
      if (toggleCommandArgs === 'on' || toggleCommandArgs === 'off') {
        const allowOffensesStatus = await this.toggleAllowOffenses(message.command?.groupId, toggleCommandArgs === 'on')
        if (allowOffensesStatus && message.reply) {
          message.reply(`Ofensas ${toggleCommandArgs === 'on' ? 'ativadas' : 'desativadas'} com sucesso`)
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        message.reply(`Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_habilita ofensas no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_desabilita ofensas no grupo_)`)
      }
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('ofensa', new ValidationRunner([adminValidator, methodValidator]))
  }
}
