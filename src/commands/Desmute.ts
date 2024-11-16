import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { getWhatsAppId } from '../utils/getWhatsappId';
import { sanitizeNumber } from '../utils/conversionHelpers';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateParticipantNotAdmin from '../validators/ValidateParticipantNotAdmin';
import ValidateParticipantNotSelf from '../validators/ValidateParticipantNotSelf';

export default class UnmuteCommand extends BaseCommand {
  private readonly logger = pino()
  private async unmuteUser(groupId: string, userJid: string): Promise<boolean> {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return false;
      }
      if (!existentGroup.blackListedUsers) {
        existentGroup.blackListedUsers = []
      }
      if (!existentGroup.blackListedUsers.includes(userJid)) {
        return true
      }
      existentGroup.blackListedUsers.filter(u => u !== userJid)
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
    const args = message.command?.args
    if (!args) {
      throw new Error('Args not found')
    }
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (userNumber && groupMetadata && message.reply) {
      const sanitizedNumber = sanitizeNumber(userNumber)
      const participant = groupMetadata.participants.find(p => p.id === getWhatsAppId(sanitizedNumber))
      if (!participant) {
        this.logger.info(
          `User ${sanitizedNumber} not found in group ${groupMetadata.id}`
        )
        message.reply('Usuário não encontrado.')
        return
      }
      if (participant.admin) {
        this.logger.info(
          `Cannot unmute admin ${sanitizedNumber}`
        )
        return
      }
      const isUserUnmuted = await this.unmuteUser(message.command?.groupId || '', getWhatsAppId(sanitizedNumber))
      if (isUserUnmuted) {
        this.logger.info("Participant unmuted");
        message.reply('Usuário agora pode enviar mensagens livremente.')
        return
      } else {
        this.logger.info("Participant not unmuted");
      }
    }
  }
  constructor() {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['reply', 'mention'])
    const validateParticipantNotAdmin = new ValidateParticipantNotAdmin()
    const validateParticipantNotSelf = new ValidateParticipantNotSelf()
    super('desmute', new ValidationRunner([validateExecutorAdmin, validateMethods, validateParticipantNotAdmin, validateParticipantNotSelf]))
  }
}
