import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import Group from '../../../models/group.model';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ command }: WhatsAppMessage): Promise<void> {
    if (!command || !command?.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    if (!command.args) {
      this.result = { message: ERROR_MESSAGES.ARGS, status: '400' }
      return;
    }
    if (command?.args && typeof command?.args === 'string') {
      const welcomeMessage = command?.args
      const result = await this.updateWelcomeMessage(command.groupId, welcomeMessage)
      if (!result) {
        this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '500' }
        return;
      }
      this.result = {
        message: SUCCESS_MESSAGES.WELCOME_MESSAGE,
        status: '200'
      }
    } else if (command?.args && typeof command?.args === 'object') {
      const welcomeMessage = command?.args.join(' ')
      const result = await this.updateWelcomeMessage(command.groupId, welcomeMessage)
      if (!result) {
        this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '500' }
        return;
      }
      this.result = {
        message: SUCCESS_MESSAGES.WELCOME_MESSAGE,
        status: '200'
      }
    }
  }
  result: IExecutionResult = undefined;
  private async updateWelcomeMessage(groupId: string, welcomeMessage: string): Promise<boolean> {
    try {
      const group = await Group.findOne({ groupId: groupId }).exec()
      if (!group) {
        this.logger.info("Group not found")
        return false
      }
      group.welcomeMessage = welcomeMessage
      await group.save()
      return true
    } catch (error) {
      this.logger.error(`Error updating welcome message: ${error}`)
      return false
    }
  }
  constructor(private readonly logger: Logger) { }
}
