// feedbackFactory.ts
import { GroupCommunicationSocket } from '../sockets';
import { LoggerFeedback } from './loggerFeedback';
import { WhatsappFeedback } from './whatsappFeedback';
export enum AvailableFeedback {
  whatsapp = 'whatsapp',
  logger = 'logger'
}

export const createFeedbackSender = (instance: GroupCommunicationSocket, groupId: string, feedbackType?: AvailableFeedback): IFeedbackSender => {
  switch (feedbackType) {
    case AvailableFeedback.whatsapp:
      return new WhatsappFeedback(instance, groupId);
    case AvailableFeedback.logger:
    default:
      return new LoggerFeedback();
  }
};
export type IFeedbackSender = {
  send(message: string): Promise<void>
}
