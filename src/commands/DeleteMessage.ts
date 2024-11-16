import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import Message from '../api/models/message.model';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';
export default class DeleteMessage extends BaseCommand {
  private readonly logger = pino()
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = await this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) return
    await this.deleteQuotedMessage(instance, message)
  }
  private async deleteQuotedMessage(instance: ExtendedWaSocket, messageUpdate: ExtendedWAMessageUpdate) {
    try {
      if (!messageUpdate.quoted) {
        throw new Error('Quoted message not found')
      }

      const group = await Group.findOne({ groupId: messageUpdate.chat }).populate('messages').exec()
      if (!group) {
        throw new Error('Group not found')
      }

      const message = group.messages.find(m => m.id === messageUpdate.quoted.id)
      if (!message) {
        throw new Error('Message not found')
      }

      const currentMessage = await Message.findById(message._id).exec()
      if (!currentMessage) {
        throw new Error('Message not found')
      }

      instance.sendMessage(messageUpdate.chat, {
        delete: {
          remoteJid: currentMessage.remoteJid,
          fromMe: currentMessage.fromMe,
          id: currentMessage.id,
          participant: currentMessage.participant,
        }, force: true,
      })

      group.messages = group.messages.filter(m => m.id !== currentMessage.id)
      await currentMessage.deleteOne()
      await group.save()
    } catch (error) {
      this.logger.error(error)
    }
  }
  constructor() {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['reply'])
    super('del', new ValidationRunner([validateExecutorAdmin, validateMethods]))
  }
}
