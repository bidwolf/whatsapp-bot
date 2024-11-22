import { IFeedbackSender } from ".";
import { GroupCommunicationSocket } from "../sockets";
export class WhatsappFeedback implements IFeedbackSender {
  async send(message: string): Promise<void> {
    await this.instance.sendMessage(this.groupId, message)
  }
  constructor(private readonly instance: GroupCommunicationSocket, private readonly groupId: string) {
  }
}
