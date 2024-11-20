import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import Group from '../../../models/group.model';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  private async setCommandEnabled(groupId: string, command: string): Promise<boolean> {
    try {
      if (command === 'on' || command === 'off' || command === 'bot') {
        return false
      }
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return false;
      }
      if (!existentGroup.blockedCommands) {
        existentGroup.blockedCommands = []
      }
      if (!existentGroup.blockedCommands.includes(command)) {
        return true
      }
      existentGroup.blockedCommands = existentGroup.blockedCommands.filter(c => c !== command)
      await existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
      return false
    }
  }
  async execute({ command }: WhatsAppMessage): Promise<void> {
    // Implementação do executor
    const args = command?.args
    let commandToEnable = args
    if (args && typeof args === 'object') {
      commandToEnable = command.args[0]
    }
    const isCommandEnabled = await this.setCommandEnabled(command?.groupId || '', commandToEnable)
    if (isCommandEnabled) {
      this.result = {
        status: '200',
        'message': SUCCESS_MESSAGES.COMMAND_ENABLED
      }
      return
    }
    this.result = {
      status: '500',
      message: ERROR_MESSAGES.NOT_ENABLED
    }
  }
  result: IExecutionResult = undefined;

  constructor(private readonly logger: Logger) { }
}
