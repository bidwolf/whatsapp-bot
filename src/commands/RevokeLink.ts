import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class RevokeLink extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) {
      this.logger.info('revoke command not allowed')
      return
    }
    const inviteCode = await instance.groupRevokeInvite(groupMetadata.id)
    if (inviteCode && message.reply) {
      this.logger.info('group link revoked')
      message.reply('Link do grupo revogado, um novo link foi gerado.')
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('revogar', new ValidationRunner([adminValidator, methodValidator]))
  }
}
