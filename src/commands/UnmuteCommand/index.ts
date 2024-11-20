import { IFeedbackSender } from "../../feedback";
import ValidateExecutorAdmin from '../../validators/ValidateExecutorAdmin';
import { Logger } from 'pino';
import { AvailableCommandPlatform, IMessage } from '../../messages';
import { WhatsappValidationRunner } from '../../validators/runners/WhatsappRunner';
import { BaseCommand, ICommandFactory, IExecutor } from '..';
import { WhatsAppMessage } from '../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../sockets';
import WhatsappExecutor from './executors/unmutecommand.executor.whatsapp';
import { IValidationRunner } from '../../validators';
import ValidateMethods from '../../validators/ValidateMethods';
import ValidateParticipantNotAdmin from '../../validators/ValidateParticipantNotAdmin';
import ValidateParticipantNotSelf from '../../validators/ValidateParticipantNotSelf';

class UnmuteCommandCommandFactory<ISocketMessage extends IMessage> implements ICommandFactory<ISocketMessage> {
  init(message: ISocketMessage, instance: GroupCommunicationSocket) {
    let executor: IExecutor<ISocketMessage> = {} as IExecutor<ISocketMessage>;
    if (message.platform === AvailableCommandPlatform.WHATSAPP) {
      executor = new WhatsappExecutor(instance, this.logger);
    }
    if (!executor) {
      throw new Error('Não foi possível criar uma instância do comando solicitado');
    }
    const command = new BaseCommand(this.name, this.validationRunner, executor, this.feedBackSender);
    return command;
  }
  private name: string = 'desmute';
  private validationRunner: IValidationRunner<ISocketMessage>;
  constructor(private readonly feedBackSender: IFeedbackSender, private readonly logger: Logger) {
    const validateExecutorAdmin = new ValidateExecutorAdmin()
    const validateMethods = new ValidateMethods(['reply', 'mention'])
    const validateParticipantNotAdmin = new ValidateParticipantNotAdmin()
    const validateParticipantNotSelf = new ValidateParticipantNotSelf()
    this.validationRunner = new WhatsappValidationRunner([validateExecutorAdmin, validateMethods, validateParticipantNotAdmin, validateParticipantNotSelf])
  }
}

export default (feedBackSender: IFeedbackSender, logger: Logger): ICommandFactory<WhatsAppMessage> => {
  const factory = new UnmuteCommandCommandFactory<WhatsAppMessage>(feedBackSender, logger);
  return factory;
};
