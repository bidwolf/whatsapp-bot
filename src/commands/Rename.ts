import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class Rename extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) {
      this.logger.info('rename command not allowed')
      return
    }
    if (message.command?.args && typeof message.command?.args === 'string') {
      const description = message.command?.args
      instance.groupUpdateSubject(groupMetadata.id, description)
    } else if (message.command?.args && typeof message.command?.args === 'object') {
      const description = message.command?.args.join(' ')
      instance.groupUpdateSubject(groupMetadata.id, description)
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('nome', new ValidationRunner([adminValidator, methodValidator]))
  }
}
