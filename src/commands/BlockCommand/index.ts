import { IFeedbackSender } from "../../feedback";
import ValidateExecutorAdmin from '../../validators/ValidateExecutorAdmin';
import { Logger } from 'pino';
import { AvailableCommandPlatform, IMessage } from '../../messages';
import { WhatsappValidationRunner } from '../../validators/runners/WhatsappRunner';
import { BaseCommand, ICommandFactory, IExecutor } from '..';
import { WhatsAppMessage } from '../../messages/WhatsappMessage';
import WhatsappBlockCommandExecutor from './executors/blockcommand.executor.whatsapp';
import { IValidationRunner } from '../../validators';
import ValidateMethods from '../../validators/ValidateMethods';

class BlockCommandCommandFactory<ISocketMessage extends IMessage> implements ICommandFactory<ISocketMessage> {
  init(message: ISocketMessage) {
    let executor: IExecutor<ISocketMessage> = {} as IExecutor<ISocketMessage>;
    if (message.platform === AvailableCommandPlatform.WHATSAPP) {
      executor = new WhatsappBlockCommandExecutor(this.logger);
    }
    if (!executor) {
      throw new Error('Não foi possível criar uma instância do comando solicitado');
    }
    const command = new BaseCommand(this.name, this.validationRunner, executor, this.feedBackSender);
    return command;
  }
  getCommandName(): string {
    return this.name
  }
  private name: string = 'off';
  private validationRunner: IValidationRunner<ISocketMessage>;
  constructor(private readonly feedBackSender: IFeedbackSender, private readonly logger: Logger) {
    const adminPermissionValidator = new ValidateExecutorAdmin();
    const methodValidator = new ValidateMethods(['raw']);
    this.validationRunner = new WhatsappValidationRunner([methodValidator, adminPermissionValidator]);
  }
}

export default (
  feedBackSender: IFeedbackSender,
  logger: Logger): ICommandFactory<WhatsAppMessage> => {
  const factory = new BlockCommandCommandFactory<WhatsAppMessage>(feedBackSender, logger);
  return factory;
};
