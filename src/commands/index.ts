import { BinaryNode, GroupMetadata } from "@whiskeysockets/baileys";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../utils/messageTransformer";
import { ParticipantPermission } from "../validators/ValidateExecutorPermission";
import { getWhatsAppId } from "../utils/getWhatsappId";
import { Logger } from "pino";
import { ERROR_MESSAGES, INVITE_TEMPLATE, SUCCESS_MESSAGES } from "../utils/constants";
import { sanitizeNumber } from "../utils/conversionHelpers";
import { getVcard } from "../utils/getVcard";
import { BotCommand } from "../utils/commands";
enum AvailableCommandPlatform {
  WHATSAPP = 'Whatsapp'
}
type ICommand<ISocketMessage extends IMessage> = {
  name: string;
  validationRunner: IValidationRunner<ISocketMessage>;
  run: (message: ISocketMessage, metadata: GroupMetadata) => Promise<void>;
};
interface IMessage {
  platform: AvailableCommandPlatform;
  content: string;
  senderId: string
}
type IValidationRunner<ISocketMessage extends IMessage> = {
  runValidations: (payload: ISocketMessage, metadata: GroupMetadata) => Promise<Boolean>
}
type IValidator<ISocketMessage extends IMessage> = {
  validate: (payload: ISocketMessage, metadata: GroupMetadata) => Promise<Boolean>
}

type IExecutor<ISocketMessage extends IMessage> = {
  execute: (payload: ISocketMessage) => Promise<void>
  result?: { status: string; message: string }
}
type IFeedbackSender = {
  send(message: string): Promise<void>
}
abstract class Command<ISocketMessage extends IMessage> implements ICommand<ISocketMessage> {
  name: string;
  validationRunner: IValidationRunner<ISocketMessage>;
  async run(message: ISocketMessage, metadata: GroupMetadata): Promise<void> {
    const valid = await this.validationRunner.runValidations(message, metadata)
    if (!valid) return
    await this.WhatsappExecutor.execute(message)
    const result = this.WhatsappExecutor.result
    if (result) {
      this.feedbackSender.send(result.message)
    }
  }
  constructor(name: string, validationRunner: IValidationRunner<ISocketMessage>, private readonly WhatsappExecutor: IExecutor<ISocketMessage>, private readonly feedbackSender: IFeedbackSender) {
    this.name = name;
    this.validationRunner = validationRunner
  }
}
abstract class ValidationRunner<ISocketMessage extends IMessage> implements IValidationRunner<ISocketMessage> {
  public async runValidations(payload: ISocketMessage, metadata: GroupMetadata): Promise<Boolean> {
    try {
      for (const validator of this.validations) {
        const isValid = await validator.validate(payload, metadata);
        if (!isValid) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
  constructor(public readonly validations: IValidator<ISocketMessage>[]) {
  }
}
class WhatsAppMessage implements IMessage {
  platform = AvailableCommandPlatform.WHATSAPP;
  content: string;
  senderId: string;
  commandExecutor?: string
  groupId?: string
  vcard?: string
  method?: string
  command?: BotCommand
  constructor(socketMessage: ExtendedWAMessageUpdate) {
    this.content = socketMessage.text || '';
    this.senderId = socketMessage.sender || '';
    this.commandExecutor = socketMessage.command?.command_executor
    this.groupId = socketMessage.command?.groupId
    this.vcard = socketMessage.quoted?.vcard
    this.method = socketMessage.method
    this.command = socketMessage.command
  }
}
type IWhatsappExecutor = IExecutor<WhatsAppMessage>

class WhatsappValidationRunner extends ValidationRunner<WhatsAppMessage> {
  constructor(validations: IValidator<WhatsAppMessage>[]) {
    super(validations)
  }
}
class WhatsappCommandAdd extends Command<WhatsAppMessage> {
  constructor(executor: IExecutor<WhatsAppMessage>, feedBackSender: IFeedbackSender) {
    const name = 'add'
    const adminPermissionValidator = new WhatsappExecutorPermissionValidator('admin')
    const validationRunner = new WhatsappValidationRunner([adminPermissionValidator])
    super(name, validationRunner, executor, feedBackSender)
  }
}
class WhatsappExecutor implements IWhatsappExecutor {
  async execute({ method, vcard, command }: WhatsAppMessage): Promise<void> {
    const args = command?.args
    const groupId = command?.groupId || ''
    const metadata = await this.instance.getMetadata(groupId)
    const { inviteCode, subject } = metadata
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
      try {
        this.logger.info(`Adding participant ${newParticipantId} to group ${groupId}`)
        const response = await this.instance.add(groupId, newParticipantId)
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
  }
  result: { status: string, message: string, content?: BinaryNode } | undefined = undefined

  constructor(private readonly instance: SocketInstance, private readonly logger: Logger) { }
}
class WhatsappExecutorPermissionValidator implements IValidator<WhatsAppMessage> {
  async validate(payload: WhatsAppMessage, metadata: GroupMetadata): Promise<Boolean> {
    if (!this.permission) return true
    if (!payload.command || !payload.command.groupId || !payload.command.command_executor || !metadata) return false
    const executorWhatsappId = getWhatsAppId(payload.command.command_executor)
    const isAdmin = metadata.participants.find(participant => participant.id === executorWhatsappId)?.admin
    if (isAdmin) {
      return true
    }
    return false
  }
  constructor(private readonly permission: ParticipantPermission) { }
}
type SocketInstance = {
  getMetadata: (groupId: string) => Promise<GroupMetadata>;
  add: (groupId: string, participantId: string) => Promise<{
    status: string;
    jid: string;
    content?: BinaryNode;
  }[]>;
  sendInvite: (inviteCode: string | undefined, participantId: string, subject: string, groupId: string) => Promise<void>
  getGroupInvite: (groupId: string) => Promise<string | undefined>

}
class ZapInstance implements SocketInstance {
  constructor(private readonly socket: ExtendedWaSocket) { }
  async getMetadata(groupId: string): Promise<GroupMetadata> {
    return this.socket.groupMetadata(groupId)
  };
  async add(groupId: string, participantId: string): Promise<{
    status: string;
    jid: string;
    content?: BinaryNode;
  }[]> {
    return await this.socket.groupParticipantsUpdate(
      groupId,
      [participantId],
      'add'
    )
  }
  async sendInvite(inviteCode: string | undefined, participantId: string, groupId: string, subject: string): Promise<void> {
    const inviteLink = inviteCode ? inviteCode : await this.getGroupInvite(groupId)
    if (inviteLink) {
      await this.socket.sendMessage(
        participantId,
        { text: INVITE_TEMPLATE(subject, inviteLink) }
      );
    }
  }
  async getGroupInvite(groupId: string): Promise<string | undefined> {
    const inviteCode = await this.socket.groupInviteCode(groupId)
    return inviteCode
  }
}
class CommandFactory<ISocketMessage extends IMessage> {
  init(message: ISocketMessage, instance: SocketInstance) {
    let executor: IExecutor<ISocketMessage> = {} as IExecutor<ISocketMessage>
    if (message.platform === AvailableCommandPlatform.WHATSAPP) {
      executor = new WhatsappExecutor(instance, this.logger)
    }
    if (!executor) {
      throw new Error('Não foi possível criar uma instância do comando solicitado')
    }
    const command = new WhatsappCommandAdd(executor as IWhatsappExecutor, this.feedBackSender)
    return command
  }
  constructor(private readonly feedBackSender: IFeedbackSender, private readonly logger: Logger) {
  }
}
export default (instance: ExtendedWaSocket, socketMessage: ExtendedWAMessageUpdate, feedBackSender: IFeedbackSender, logger: Logger): Command<WhatsAppMessage> => {
  const factory = new CommandFactory<WhatsAppMessage>(feedBackSender, logger)
  const message = new WhatsAppMessage(socketMessage)
  const socket = new ZapInstance(instance)
  const command = factory.init(message, socket)
  return command
}
