import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { ERROR_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ groupMetadata }: WhatsAppMessage): Promise<void> {
    if (!groupMetadata) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      this.logger.warn('group metadata not found')
      return;
    }
    const description = groupMetadata.desc
    if (description) {
      this.logger.info(`description found on group ${groupMetadata.id}`)
      this.result = { message: this.formatGroupDescription(description), status: '200' }
    }
  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }

  private formatGroupDescription(description: string) {
    return `*Regras*:\n${description}`;
  }
}
