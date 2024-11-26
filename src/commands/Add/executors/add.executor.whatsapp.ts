import { type Logger } from "pino"
import { IExecutionResult, IExecutor } from "../.."
import { WhatsAppMessage } from "../../../messages/WhatsappMessage"
import { GroupCommunicationSocket } from "../../../sockets"
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../../utils/constants"
import { sanitizeNumber } from "../../../utils/conversionHelpers"
import { getVcard } from "../../../utils/getVcard"
import { getWhatsAppId } from "../../../utils/getWhatsappId"


export default class WhatsappAddParticipantExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ method, vcard, command, groupMetadata }: WhatsAppMessage): Promise<void> {
    const args = command?.args
    const groupId = command?.groupId || ''
    if (!groupMetadata) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    const { inviteCode, subject } = groupMetadata
    const userNumber = typeof args === 'string' ? args : args.join(' ')
    const sanitizedNumber = sanitizeNumber(userNumber);
    let newParticipantId = getWhatsAppId(sanitizedNumber);
    if (method === 'reply') {
      newParticipantId = getVcard(vcard)
      if (!newParticipantId) {
        this.logger.info(
          `No phone number found in vcard reply`
        )
        this.result = { status: '400', message: ERROR_MESSAGES.NO_VCARD }
        return
      }
    }
    try {
      this.logger.info(`Adding participant ${newParticipantId} to group ${groupId}`)
      const response = await this.instance.addUser(groupId, newParticipantId)
      if (!response || response.length > 0) {
        this.result = { status: '500', message: ERROR_MESSAGES.UNKNOWN }
        return
      }
      const result = response[0]
      this.result = { status: result.status, message: '', content: result.content }
      if (result.status === '200') {
        this.result.message = SUCCESS_MESSAGES.ADD;
        return
      }
      if (result.status === '403') {
        this.logger.info("Participant not added");
        this.result.message = ERROR_MESSAGES.ADD_DIRECTLY
        await this.instance.sendInvite(inviteCode, newParticipantId, subject, groupId);
        return
      }
      if (result.status === '409') {
        this.result.message = ERROR_MESSAGES.ALREADY_EXISTS
      }

    } catch (error) {
      this.logger.error(error)
      this.result = { status: '500', message: ERROR_MESSAGES.UNKNOWN }
    }
  }
  result: IExecutionResult = undefined

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
