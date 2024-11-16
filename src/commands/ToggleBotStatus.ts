
import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import Group from '../api/models/group.model';
import { COMMAND_PREFIX } from '../utils/constants';
import ValidationRunner from '../validators/ValidationRunner';
import ValidateMethods from '../validators/ValidateMethods';
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
export default class ToggleBotStatus extends BaseCommand {
  private async toggleBotStatus(groupId: string, isBotEnabled: boolean) {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      existentGroup.enabled = isBotEnabled
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
      let botStatusArgs = message.command?.args
      if (message.command?.args && typeof message.command?.args === 'object') {
        botStatusArgs = message.command?.args[0]
      }
      if (botStatusArgs === 'on' || botStatusArgs === 'off') {
        const isInviteToggleStatus = await this.toggleBotStatus(message.command?.groupId, botStatusArgs === 'on')
        if (isInviteToggleStatus && message.reply) {
          instance.sendMessage(message.command?.groupId, {
            text: `Bot ${botStatusArgs === 'off' ? 'des' : 'h'}abilitado.`,
          })
        }
        return
      }
      if (message.reply) {
        this.logger.info('No args found or invalid args')
        instance.sendMessage(message.command?.groupId, {
          text: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + this.command_name} on* (_habilita o bot no grupo_)\n*${COMMAND_PREFIX + this.command_name} off* (_desabilita o bot no grupo_)`,
        })
      }
    }
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('bot', new ValidationRunner([adminValidator, methodValidator]))
  }
}
