import { IFeedbackSender } from ".";
import { ExtendedWaSocket } from "../utils/messageTransformer";

export class WhatsappFeedback implements IFeedbackSender {
  async send(message: string): Promise<void> {
    await this.instance.sendMessage(this.jid, {
      text: message
    })
  }
  constructor(private readonly instance: ExtendedWaSocket, private readonly jid: string) {
  }
}
