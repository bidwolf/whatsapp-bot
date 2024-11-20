import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../../utils/constants';
import { sanitizeNumber } from '../../../utils/conversionHelpers';
import { getWhatsAppId } from '../../../utils/getWhatsappId';
import Group from '../../../models/group.model';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ command }: WhatsAppMessage): Promise<void> {
    const args = command?.args
    if (!args) {
      throw new Error('Args not found')
    }
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    if (!command.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    if (userNumber) {
      const sanitizedNumber = sanitizeNumber(userNumber)
      const userUnmuteStatus = await this.unmuteUser(command.groupId, getWhatsAppId(sanitizedNumber))
      if (userUnmuteStatus) {
        this.result = { message: SUCCESS_MESSAGES.PARTICIPANT_UNMUTED, status: '200' }
        return
      } else {
        this.result = { message: ERROR_MESSAGES.PARTICIPANT_NOT_MUTED, status: '400' }
      }
    }
  }
  result: IExecutionResult = undefined;
  private async unmuteUser(groupId: string, userJid: string): Promise<boolean> {
    try {
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return false;
      }
      if (!existentGroup.blackListedUsers) {
        existentGroup.blackListedUsers = []
      }
      if (!existentGroup.blackListedUsers.includes(userJid)) {
        return true
      }
      existentGroup.blackListedUsers.filter(u => u !== userJid)
      await existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
      return false
    }
  }
  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
