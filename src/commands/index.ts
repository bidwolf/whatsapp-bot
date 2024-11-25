import { IMessage } from "../messages";
import { IValidationRunner } from "../validators";
import { GroupCommunicationSocket } from "../sockets";
import { IFeedbackSender } from "../feedback";
import { type BinaryNode } from "@whiskeysockets/baileys/lib/WABinary/types";
import Group, { IGroup } from "../models/group.model";
import { COMMAND_PREFIX, ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants";
import { Logger } from "pino";

export type ICommand<ISocketMessage extends IMessage> = {
  name: string;
  validationRunner: IValidationRunner<ISocketMessage>;
  run: (message: ISocketMessage) => Promise<void>;
};
export type IExecutionResult = {
  status: string;
  message: string;
  content?: BinaryNode;
} | undefined;
export type IExecutor<ISocketMessage extends IMessage> = {
  execute: (payload: ISocketMessage) => Promise<void>
  result: IExecutionResult
}
export type ICommandFactory<ISocketMessage extends IMessage> = {
  init(message: ISocketMessage, instance: GroupCommunicationSocket): ICommand<ISocketMessage>
  getCommandName(): string
}
export type CreateCommandFactory<ISocketMessage extends IMessage> = (feedBackSender: IFeedbackSender, logger: Logger) => ICommandFactory<ISocketMessage>;

export abstract class Command<ISocketMessage extends IMessage> implements ICommand<ISocketMessage> {
  name: string;
  validationRunner: IValidationRunner<ISocketMessage>;
  async run(message: ISocketMessage): Promise<void> {
    const validationResult = await this.validationRunner.runValidations(message)
    if (!validationResult.isValid) {
      if (!validationResult.errorMessage) return
      this.feedbackSender.send(validationResult.errorMessage)
      return
    }
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
export class BaseCommand<ISocketMessage extends IMessage> extends Command<ISocketMessage> {
  constructor(name: string, validationRunner: IValidationRunner<ISocketMessage>, executor: IExecutor<ISocketMessage>, feedbackSender: IFeedbackSender) {
    super(name, validationRunner, executor, feedbackSender);
  }
}
export type GroupField = keyof IGroup
export abstract class ToggleExecutor<ISocketMessage extends IMessage> implements IExecutor<ISocketMessage> {
  async execute({ command }: ISocketMessage): Promise<void> {
    if (command?.groupId) {
      let floodStatusArg = command.args
      if (command.args && typeof command.args === 'object') {
        floodStatusArg = command.args[0]
      }
      if (floodStatusArg === 'on' || floodStatusArg === 'off') {
        const allowFloodStatus = await this.toggle(command.groupId, floodStatusArg === 'on')
        if (allowFloodStatus) {
          this.logger.info(`Detecção de flood ${floodStatusArg === 'on' ? 'ativado' : 'desativado'} com sucesso`)
        }
        return
      }
      this.logger.info('No args found or invalid args')
      this.result = {
        message: this.helpMessage(command.command_name),
        status: '400'
      }
    }
  }
  result: IExecutionResult;
  private helpMessage(commandName: string): string {
    return `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + commandName} on* (_${this.onEnableDescription}_)\n*${COMMAND_PREFIX + commandName} off* (_${this.onDisableDescription}_)`
  }
  private async toggle(groupId: string, toggleValue: boolean): Promise<boolean> {
    if (this.forbiddenFields.includes(this.field)) {
      this.result = {
        message: ERROR_MESSAGES.FORBIDDEN,
        status: '403'
      }
      return false
    }
    try {
      const group = await Group.findOne({
        groupId: groupId
      })
      if (!group) {
        this.result = { message: ERROR_MESSAGES.GROUP_NOT_FOUND, status: '400' }
        return false
      }
      if (typeof group[this.field] === 'boolean') {
        await group.updateOne({ groupId: groupId }, { $set: { [this.field]: toggleValue } })
        this.result = {
          message: toggleValue ? SUCCESS_MESSAGES.ON : SUCCESS_MESSAGES.OFF,
          status: '200'
        }
        return true
      }
      this.result = {
        message: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
        status: '405'
      }
      return false
    } catch (error) {
      this.result = {
        message: ERROR_MESSAGES.UNKNOWN,
        status: '500'
      }
      return false
    }
  }
  private forbiddenFields: GroupField[] = ['groupId', 'blackListedUsers', 'welcomeMessage', 'blockedCommands']
  constructor(private readonly field: GroupField, private readonly onEnableDescription: string, private readonly onDisableDescription: string, private readonly logger: Logger) { }
}
