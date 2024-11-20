import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { ERROR_MESSAGES } from '../../../utils/constants';
import Group from '../../../models/group.model';
import Message from '../../../models/message.model';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  private async deleteQuotedMessage(groupId: string, quoted?: {
    id: string
  }) {
    try {
      if (!quoted) {

        this.result = {
          message: ERROR_MESSAGES.REPLY,
          status: '400',
        }
        return
      }

      const group = await Group.findOne({ groupId: groupId }).populate('messages').exec()
      if (!group) {
        throw new Error('Group not found')
      }

      const currentMessage = await Message.findOne({ id: quoted.id }).exec()
      if (!currentMessage) {
        throw new Error('Message not found')
      }

      const result = await this.instance.deleteMessageFromGroup(
        groupId, {
        id: currentMessage.id,
        participant: currentMessage.participant
      }
      )
      if (result) {
        group.messages = group.messages.filter(m => m.id !== currentMessage.id)
        await currentMessage.deleteOne()
        await group.save()
        this.result = {
          message: 'Mensagem excluída com sucesso',
          status: '200'
        }
      }

    } catch (error) {
      this.logger.error(error)
      this.result = {
        message: ERROR_MESSAGES.UNKNOWN,
        status: '500'
      }
    }
  }
  async execute({ command, quoted }: WhatsAppMessage): Promise<void> {
    await this.deleteQuotedMessage(command?.groupId || '', quoted)
  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }
}
