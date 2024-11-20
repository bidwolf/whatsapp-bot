import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { ERROR_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ command }: WhatsAppMessage): Promise<void> {
    if (!command?.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    const messageSent = await this.instance.mentionAll(command.groupId)
    if (messageSent) {
      this.logger.info(`All users mentioned in group ${command.groupId}`)
      this.result = {
        message: '', status: '200'
      }
      return
    }
    this.logger.warn('something wrong while sending mention')
    this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
