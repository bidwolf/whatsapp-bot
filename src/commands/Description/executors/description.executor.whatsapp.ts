import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ command }: WhatsAppMessage): Promise<void> {
    if (!command?.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    if (command?.args && typeof command?.args === 'string') {
      const description = command?.args
      await this.instance.updateGroupDescription(command.groupId, description)
      this.result = {
        message: SUCCESS_MESSAGES.UPDATE_DESCRIPTION,
        status: '200'
      }
      return
    } if (command?.args && typeof command?.args === 'object') {
      const description = command?.args.join(' ')
      await this.instance.updateGroupDescription(command.groupId, description)
      this.logger.info('Description group updated')
      this.result = {
        message: SUCCESS_MESSAGES.UPDATE_DESCRIPTION,
        status: '200'
      }
      return
    }
    this.result = {
      message: ERROR_MESSAGES.DESCRIPTION,
      status: '500'
    }
  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
