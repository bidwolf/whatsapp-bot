import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class WelcomeMessage extends BaseCommand {
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = await this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) return
    if (message.command?.args && typeof message.command?.args === 'string') {
      const welcomeMessage = message.command?.args
      this.updateWelcomeMessage(groupMetadata.id, welcomeMessage)
      message.reply?.(`Mensagem de boas-vindas atualizada com sucesso`)
    } else if (message.command?.args && typeof message.command?.args === 'object') {
      const welcomeMessage = message.command?.args.join(' ')
      this.updateWelcomeMessage(groupMetadata.id, welcomeMessage)
      message.reply?.(`Mensagem de boas-vindas atualizada com sucesso`)
    }
  }
  private async updateWelcomeMessage(groupId: string, welcomeMessage: string) {
    try {
      const group = await Group.findOne({ groupId: groupId }).exec()
      if (!group) {
        this.logger.info("Group not found")
        return
      }
      group.welcomeMessage = welcomeMessage
      await group.save()
    } catch (error) {
      this.logger.error(`Error updating welcome message: ${error}`)
    }
  }
  private readonly logger = pino()

  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('msg', new ValidationRunner([adminValidator, methodValidator]))
  }
}
