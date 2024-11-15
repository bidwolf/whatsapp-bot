import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "../utils/messageTransformer";
import { COMMAND_PREFIX } from "./constants";
import { CommandValidator, Validator } from "../validators";

export type BotCommand = {
  command_name: string;
  args: any;
  groupId: string | undefined;
  command_executor: string | undefined;
}
export type Method = "mention" | "reply" | "raw"
/**
 * BaseCommand
 * @description Base class for all commands for enforcing a common interface
 */
interface ICommand {
  command_name: string;
  validator: Validator
  execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void>;
}
interface ICommandExtractor {
  retrieveCommandDetails(): { command: BotCommand | undefined, method: Method }
}
export abstract class BaseCommand implements ICommand {
  command_name: string;
  validator: Validator
  constructor(command_name: string, validator: Validator) {
    this.command_name = command_name
    this.validator = validator
  }
  abstract execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void>;
}
export class CommandExtractor implements ICommandExtractor {
  private isMention = () => {
    const is_command = this.payload.message ? this.payload.message.extendedTextMessage?.text.startsWith(COMMAND_PREFIX) : null
    return { command: is_command && this.payload.message ? this.payload.message.extendedTextMessage.text : null };
  };

  private isRaw = () => {
    const is_command = this.payload.message && this.payload.message.conversation ? this.payload.message.conversation.startsWith(COMMAND_PREFIX) : null
    return { command: is_command && this.payload.message ? this.payload.message.conversation : null };
  };

  private isExtended = () => {
    const is_command = this.payload.message ? this.payload.message.extendedTextMessage?.text.startsWith(COMMAND_PREFIX) : null
    return { command: is_command && this.payload.message ? this.payload.message.extendedTextMessage.text : null };
  };
  private extractCommandDetails = (command: string): { command_name: string, args: string[] } => {
    const commandWithoutPrefix = command.slice(COMMAND_PREFIX.length).trim();
    const firstSpaceIndex = commandWithoutPrefix.indexOf(' ');
    const command_name = firstSpaceIndex === -1 ? commandWithoutPrefix : commandWithoutPrefix.slice(0, firstSpaceIndex);
    const args = firstSpaceIndex === -1 ? [] : commandWithoutPrefix.slice(firstSpaceIndex + 1).split(/\s+/);
    return { command_name, args };
  };
  private getRawCommand = (): BotCommand | undefined => {
    const { command } = this.isRaw();
    if (!command /* || this.payload.key.fromMe*/) return undefined;
    const { command_name, args } = this.extractCommandDetails(command);
    return {
      command_name,
      args,
      groupId: this.payload.message && this.payload.message.senderKeyDistributionMessage?.groupId ? this.payload.message.senderKeyDistributionMessage?.groupId : this.payload.key.remoteJid ?? undefined,
      command_executor: this.payload.key.participant == '' ? this.payload.sender : this.payload.key.participant ?? undefined
    };
  };
  private getExtendedCommand = (): BotCommand | undefined => {
    const { command } = this.isExtended();
    if (!command /* || this.payload.key.fromMe*/) return undefined;
    const command_name = command.replace(COMMAND_PREFIX, '');
    return {
      command_name,
      args: this.payload.message?.extendedTextMessage.contextInfo.participant,
      groupId: this.payload.message && this.payload.message.senderKeyDistributionMessage?.groupId ? this.payload.message.senderKeyDistributionMessage?.groupId : this.payload.key.remoteJid ?? undefined,
      command_executor: this.payload.key.participant == '' ? this.payload.sender && this.payload.sender != 'unknown' ? this.payload.sender : this.payload.msg?.contextInfo?.participant : this.payload.key.participant ?? undefined
    };
  };
  private getMentionCommand = (): BotCommand | undefined => {
    const { command } = this.isMention();
    if (!command /* || this.payload.key.fromMe*/) return undefined;
    const command_name = this.extractCommandDetails(command).command_name;
    return {
      command_name,
      args: this.payload.message?.extendedTextMessage.contextInfo.mentionedJid,
      groupId: this.payload.message && this.payload.message.senderKeyDistributionMessage?.groupId ? this.payload.message.senderKeyDistributionMessage?.groupId : this.payload.key.remoteJid ?? undefined,
      command_executor: this.payload.key.participant == '' ? this.payload.sender : this.payload.key.participant ?? undefined
    };
  };
  public retrieveCommandDetails = (): { command: BotCommand | undefined, method: Method } => {
    const extendedCommand = this.getExtendedCommand();
    const mentionCommand = this.getMentionCommand();
    const rawCommand = this.getRawCommand();
    if (extendedCommand && extendedCommand?.args) {
      return { command: extendedCommand, method: 'reply' };
    }
    if (mentionCommand && mentionCommand?.args) {
      return { command: mentionCommand, method: 'mention' };
    }
    if (rawCommand && rawCommand?.args) {
      return { command: rawCommand, method: 'raw' };
    }
    return rawCommand ? { command: rawCommand, method: 'raw' } : mentionCommand ? { command: mentionCommand, method: 'mention' } : { command: extendedCommand, method: 'reply' }
  }
  constructor(private readonly payload: ExtendedWAMessageUpdate) { }
}
