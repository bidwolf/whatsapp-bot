import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';

export default class BlockCommand extends BaseCommand {
  private readonly logger = pino()
  private async blockCommand(groupId: string, command: string): Promise<boolean> {
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
    if (!args) {
      throw new Error('Args not found')
    }
    let commandToBlock = args
    if (command.args && typeof command.args === 'object') {
      commandToBlock = command.args[0]
    }
    const isCommandBlocked = await this.blockCommand(command.groupId || '', commandToBlock)
    if (isCommandBlocked) {
      if (message.reply) {
        message.reply(`Comando ${commandToBlock} bloqueado com sucesso`)
      }
      return
    }
  }
  constructor() {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['raw'])
    super('off', new ValidationRunner([validateExecutorAdmin, validateMethods]))
  }
}
