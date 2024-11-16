
import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class ToggleShareInvite extends BaseCommand {
  private async toggleShareInvite(groupId: string, isShareInviteEnabled: boolean) {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.shareInviteEnabled = isShareInviteEnabled
      existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
    }
    return false
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
    if (message.command?.groupId) {
      let inviteArg = message.command?.args
      if (message.command?.args && typeof message.command?.args === 'object') {
        inviteArg = message.command?.args[0]
      }
      if (inviteArg === 'on' || inviteArg === 'off') {
        const isInviteToggleStatus = await this.toggleShareInvite(message.command?.groupId, inviteArg === 'off') // if antic is "on", then, isShareInviteEnabled is false
        if (isInviteToggleStatus && message.reply) {
          instance.sendMessage(message.command?.groupId, {
            text: `Convites externos ${inviteArg === 'on' ? 'des' : 'h'}abilitados.`,
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(message.command?.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_desabilita os convites externos_)\n*${COMMAND_PREFIX + this.command_name} off* (_habilita os convites externos_)`,
        })
      }
    }
  }
  private readonly logger = pino()

  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('antic', new ValidationRunner([adminValidator, methodValidator]))
  }
}
