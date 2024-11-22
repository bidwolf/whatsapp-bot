// feedbackFactory.ts
import { GroupCommunicationSocket } from '../sockets';
import { LoggerFeedback } from './loggerFeedback';
import { WhatsappFeedback } from './whatsappFeedback';
const config = require('../config/config');
export enum AvailableFeedback {
  whatsapp = 'whatsapp',
  logger = 'logger'
}

export const createFeedbackSender = (instance: GroupCommunicationSocket, groupId: string): IFeedbackSender => {
  switch (config.feedbackType) {
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
