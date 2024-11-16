import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class NotifyAllMembers extends BaseCommand {
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
    let mentionText = ''
    const mentions = groupMetadata.participants.map(p => {

      mentionText += `@${p.id.split('@')[0]} `
      return p.id
    })
    instance.sendMessage(groupMetadata.id, {
      text: mentionText,
      mentions: mentions
    })

  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('all', new ValidationRunner([adminValidator, methodValidator]))
  }
}
