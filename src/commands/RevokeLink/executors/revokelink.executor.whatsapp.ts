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
    const inviteCode = await this.instance.revokeInvite(command.groupId)
    if (inviteCode) {
      this.logger.info('Group link revoked')
      this.result = { message: SUCCESS_MESSAGES.LINK_REVOKED, status: '200' }
    }
    this.result = { message: ERROR_MESSAGES.LINK_NOT_CREATED, status: '400' }

  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
