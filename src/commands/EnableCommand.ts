import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';

export default class EnableCommand extends BaseCommand {
  private readonly logger = pino()
  private async setCommandEnabled(groupId: string, command: string): Promise<boolean> {
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
      if (!existentGroup.blockedCommands.includes(command)) {
        return true
      }
      existentGroup.blockedCommands = existentGroup.blockedCommands.filter(c => c !== command)
      await existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
      return false
    }
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
    const args = command?.args
    let commandToEnable = args
    if (args && typeof args === 'object') {
      commandToEnable = command.args[0]
    }
    const isCommandEnabled = await this.setCommandEnabled(command?.groupId || '', commandToEnable)
    if (isCommandEnabled) {
      if (message.reply) {
        message.reply(`Comando ${commandToEnable} habilitado com sucesso`)
      }
      return
    }
  }
  constructor() {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['raw'])
    super('on', new ValidationRunner([validateExecutorAdmin, validateMethods]))
  }
}
