import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { getWhatsAppId } from '../utils/getWhatsappId';
import { sanitizeNumber } from '../utils/conversionHelpers';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateParticipantNotAdmin from '../validators/ValidateParticipantNotAdmin';
import ValidateParticipantNotSelf from '../validators/ValidateParticipantNotSelf';

export default class MuteCommand extends BaseCommand {
  private readonly logger = pino()
  private async muteUser(groupId: string, userJid: string): Promise<boolean> {
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
      if (existentGroup.blackListedUsers.includes(userJid)) {
        return true
      }
      existentGroup.blackListedUsers.push(userJid)
      await existentGroup.save();
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
      const isUserSilenced = await this.muteUser(message.command?.groupId || '', getWhatsAppId(sanitizedNumber))
      if (isUserSilenced) {
        this.logger.info("Participant muted");
        message.reply('Usuário silenciado com sucesso.')
        return
      } else {
        this.logger.info("Participant not muted");
      }
    }
  }
  constructor() {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['reply', 'mention'])
    const validateParticipantNotAdmin = new ValidateParticipantNotAdmin()
    const validateParticipantNotSelf = new ValidateParticipantNotSelf()

    super('mute', new ValidationRunner([validateExecutorAdmin, validateMethods, validateParticipantNotAdmin, validateParticipantNotSelf]))
  }
}
