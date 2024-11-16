import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';
export default class GroupLink extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) {
      this.logger.info('link command not allowed')
      return
    }
    const inviteCode = await instance.groupInviteCode(groupMetadata.id)
    if (inviteCode && message.reply) {
      this.logger.info('group link sent')
      message.reply(`Link do grupo: https://chat.whatsapp.com/${inviteCode}`)
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('link', new ValidationRunner([adminValidator, methodValidator]))
  }
}
