
import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
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
      await existentGroup.save();
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
      let enableGringosArg = message.command?.args
      if (message.command?.args && typeof message.command?.args === 'object') {
        enableGringosArg = message.command?.args[0]
      }
      if (enableGringosArg === 'on' || enableGringosArg === 'off') {
        const isGringoEnabledStatus = await this.toggleBrazilOnly(message.command?.groupId, enableGringosArg === 'off') // if gringos are enabled, then, onlyBrazil is false
        if (isGringoEnabledStatus && message.reply) {
          instance.sendMessage(message.command?.groupId, {
            text: `Os estrangeiros ${enableGringosArg === 'on' ? '' : 'não'} podem entrar nesse grupo`,
            viewOnce: true,
            time: 86400
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(message.command?.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_desabilita a entrada de estrangeiros no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_permite a entrada de estrangeiros no grupo_)`,
          viewOnce: true,
          time: 86400
        })
      }
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('gringo', new ValidationRunner([adminValidator, methodValidator]))
  }
}
