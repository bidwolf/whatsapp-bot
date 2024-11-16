import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class ToggleChat extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = await this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) return
    let toggleCommandArgs = message.command?.args
    if (message.command?.args && typeof message.command?.args === 'object') {
      toggleCommandArgs = message.command?.args[0]
    }
    if (toggleCommandArgs === 'on') {
      instance.groupSettingUpdate(groupMetadata.id, 'not_announcement')
      return
    }
    if (toggleCommandArgs === 'off') {
      instance.groupSettingUpdate(groupMetadata.id, 'announcement')
      return
    }
    if (message.reply) {
      this.logger.info('No args found or invalid args')
      message.reply(`Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_permite que todos enviem mensagens no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_somente administradores podem enviar mensagens no grupo_)`)
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('chat', new ValidationRunner([adminValidator, methodValidator]))
  }
}
