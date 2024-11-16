
import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class Flood extends BaseCommand {
  private async toggleAllowFlood(groupId: string, isFloodControlEnabled: boolean) {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.spamDetection = isFloodControlEnabled
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
    const { command } = message
    if (command?.groupId) {
      let floodStatusArg = command.args
      if (command.args && typeof command.args === 'object') {
        floodStatusArg = command.args[0]
      }
      if (floodStatusArg === 'on' || floodStatusArg === 'off') {
        const allowFloodStatus = await this.toggleAllowFlood(command.groupId, floodStatusArg === 'on')
        if (allowFloodStatus && message.reply) {
          message.reply(`Detecção de flood ${floodStatusArg === 'on' ? 'ativado' : 'desativado'} com sucesso`)
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        message.reply(`Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_habilita o flood no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_desabilita flood no grupo_)`)
      }
    }
  }
  private readonly logger = pino()
  constructor() {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['raw'])
    super('flood', new ValidationRunner([validateExecutorAdmin, validateMethods]))
  }
}
