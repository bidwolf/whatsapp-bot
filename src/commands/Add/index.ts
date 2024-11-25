import ValidateExecutorAdmin from "../../validators/ValidateExecutorAdmin";
import { Logger } from "pino";
import { AvailableCommandPlatform, IMessage } from "../../messages";
import { WhatsappValidationRunner } from "../../validators/runners/WhatsappRunner";
import { BaseCommand, ICommandFactory, IExecutor } from "..";
import { WhatsAppMessage } from "../../messages/WhatsappMessage";
import { GroupCommunicationSocket } from "../../sockets";
import WhatsappExecutor from "./executors/add.executor.whatsapp";
import { IValidationRunner } from "../../validators";
import ValidateMethods from "../../validators/ValidateMethods";
import ValidateNumber from "../../validators/ValidateNumber";
import { IFeedbackSender } from "../../feedback";

class CommandAddFactory<ISocketMessage extends IMessage> implements ICommandFactory<ISocketMessage> {
  init(message: ISocketMessage, instance: GroupCommunicationSocket) {
    let executor: IExecutor<ISocketMessage> = {} as IExecutor<ISocketMessage>
    if (message.platform === AvailableCommandPlatform.WHATSAPP) {
      executor = new WhatsappExecutor(instance, this.logger)
    }
    if (!executor) {
      throw new Error('Não foi possível criar uma instância do comando solicitado')
    }
    const command = new BaseCommand(this.name, this.validationRunner, executor, this.feedBackSender)
    return command
  }
  getCommandName(): string {
    return this.name
  }
  private name: string = 'add'
  private validationRunner: IValidationRunner<ISocketMessage>
  constructor(private readonly feedBackSender: IFeedbackSender, private readonly logger: Logger) {
    const adminPermissionValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(["raw", "reply"])
    const validateNumber = new ValidateNumber()
    this.validationRunner = new WhatsappValidationRunner([methodValidator, validateNumber, adminPermissionValidator])
  }
}

export default (
  feedBackSender: IFeedbackSender,
  logger: Logger): ICommandFactory<WhatsAppMessage> => {
  const factory = new CommandAddFactory<WhatsAppMessage>(feedBackSender, logger)
  return factory
}
