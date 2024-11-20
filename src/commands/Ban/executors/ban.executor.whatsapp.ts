import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { sanitizeNumber } from '../../../utils/conversionHelpers';
import { getWhatsAppId } from '../../../utils/getWhatsappId';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../utils/constants';

export default class BanParticipantWhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ command }: WhatsAppMessage): Promise<void> {
    const args = command?.args
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (!command?.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    if (userNumber) {
      const sanitizedNumber = sanitizeNumber(userNumber)
      const response = await this.instance.removeUser(command.groupId, getWhatsAppId(sanitizedNumber));
      if (response && response.length > 0) {
        this.logger.info("Participant removed");
        const result = response[0]
        this.result = {
          status: result.status,
          content: result.content, message: ''
        }
        if (response[0].status == '200') {
          this.result.message = SUCCESS_MESSAGES.BAN
          this.logger.info(`User ${result.jid} was removed from group ${command.groupId}`)
          return
        }
        this.result.message = ERROR_MESSAGES.NOT_BANNED
      } else {
        this.logger.info("Participant not removed");
      }
    }
  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
