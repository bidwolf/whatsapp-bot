import { type Logger } from "pino";
import { IExecutionResult, IExecutor } from "../..";
import { WhatsAppMessage } from "../../../messages/WhatsappMessage";
import { ChatUpdateStatus, GroupCommunicationSocket } from "../../../sockets";
import { sanitizeNumber } from "../../../utils/conversionHelpers";
import { getWhatsAppId } from "../../../utils/getWhatsappId";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../../utils/constants";

export default class WhatsappAdminParticipantExecutor implements IExecutor<WhatsAppMessage> {
  async execute(payload: WhatsAppMessage): Promise<void> {
    const args = payload.command?.args;
    const userNumber = typeof args === 'string' ? args : args.join(' ');
    const groupMetadata = await this.instance.getMetadata(payload.command?.groupId || '');
    if (!groupMetadata) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    if (userNumber) {
      const sanitizedNumber = sanitizeNumber(userNumber);
      const whatsAppParticipantId = getWhatsAppId(sanitizedNumber);
      const shouldDemote = groupMetadata.participants.find(participant => participant.id === whatsAppParticipantId)?.admin
      let response: ChatUpdateStatus[]
      if (shouldDemote) {
        response = await this.instance.demoteUser(groupMetadata.id, whatsAppParticipantId)
      } else {
        response = await this.instance.promoteUser(
          groupMetadata.id,
          whatsAppParticipantId,
        )
      }
      if (!response || response.length > 0) {
        this.result = { status: '500', message: ERROR_MESSAGES.UNKNOWN }
        return
      }
      const result = response[0]
      this.result = { status: result.status, message: '', content: result.content }
      if (result.status === '200') {
        this.result.message = shouldDemote ? SUCCESS_MESSAGES.ADM_DEMOTE : SUCCESS_MESSAGES.ADM_PROMOTE;
        return
      }
      this.logger.info(shouldDemote ? "Participant not demoted" : "Participant not promoted");
      return;
    }
  }
  result: IExecutionResult;
  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }

}
