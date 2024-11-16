import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';
export default class Description extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) {
      this.logger.info('change description not allowed')
      return
    }
    if (message.command?.args && typeof message.command?.args === 'string') {
      const description = message.command?.args
      instance.groupUpdateDescription(groupMetadata.id, description)
    } else if (message.command?.args && typeof message.command?.args === 'object') {
      const description = message.command?.args.join(' ')
      instance.groupUpdateDescription(groupMetadata.id, description)
      this.logger.info('description group updated')
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('desc', new ValidationRunner([adminValidator, methodValidator]))
  }
}
