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
    const inviteCode = await this.instance.getGroupInvite(command.groupId)
    if (inviteCode) {
      this.logger.info('Group link sent')
      this.result = { message: this.buildInviteLink(inviteCode), status: '200' }
    }
    this.result = { message: ERROR_MESSAGES.LINK_NOT_CREATED, status: '400' }

  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }

  private buildInviteLink(inviteCode: string): any {
    return `Link do grupo: https://chat.whatsapp.com/${inviteCode}`;
  }
}
