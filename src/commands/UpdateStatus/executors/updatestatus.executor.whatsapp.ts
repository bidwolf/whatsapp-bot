import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute(payload: WhatsAppMessage): Promise<void> {
    if (!payload.command?.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    const status = this.extractStatusFromMessage(payload);
    if (!status) {
      this.logger.info('no status found')
      this.result = {
        message: ERROR_MESSAGES.STATUS_NOT_FOUND, status: '404'
      }
      return
    }
    this.instance.updateBotStatus(status)
    this.result = {
      message: SUCCESS_MESSAGES.STATUS_UPDATED,
      status: '200'
    }
  }
  result: IExecutionResult = undefined;
  private extractStatusFromMessage(payload: WhatsAppMessage): string {
    const checkIfStatusIsString = payload.command?.args && typeof payload.command?.args === 'string';
    const checkIfStatusArgsExist = payload.command?.args && typeof payload.command?.args === 'object';
    const status = checkIfStatusIsString ? payload.command?.args : checkIfStatusArgsExist ? payload.command?.args.join(' ') : '';
    return status;
  }
  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
