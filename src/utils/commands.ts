import { GroupMetadata } from "@whiskeysockets/baileys";
import { ExtendedWAMessageUpdate } from "../api/class/myfunc";

const { COMMAND_PREFIX } = require("./constants");

interface Key {
  remoteJid?: string | null;
  fromMe?: boolean | null;
  participant?: string | null;
  id?: string | null;
}

interface SenderKeyDistributionMessage {
  groupId: string;
}

interface Message {
  conversation: string;
  senderKeyDistributionMessage?: SenderKeyDistributionMessage;
}

interface ContextInfo {
  groupMentions: any[];
  mentionedJid: any[];
  participant: string;
  quotedMessage: Message;
}

interface ExtendedTextMessage {
  contextInfo: ContextInfo;
  inviteLinkGroupTypeV2: number;
  previewType: number;
  text: string;
}

interface PayloadMessage {
  key: Key;
  message?: Message;
  participant: string;
}

interface ExtendedMessage {
  extendedTextMessage: ExtendedTextMessage;
  messageContextInfo: any;
  senderKeyDistributionMessage?: SenderKeyDistributionMessage;
}

interface ExtendedPayload {
  key: Key;
  message?: ExtendedMessage;
}

interface MentionMessage {
  extendedTextMessage: ExtendedTextMessage;
  senderKeyDistributionMessage: SenderKeyDistributionMessage;
  messageContextInfo: any;
}

interface PayloadMentionMessage {
  key: Key;
  message?: MentionMessage;
}
export type BotCommand = {
  command_name: string;
  args: any;
  groupId: string | undefined;
  command_executor: string | undefined;
}
export const is_command_mention = (payload: PayloadMentionMessage) => {
  const is_command = payload.message ? payload.message.extendedTextMessage?.text.startsWith(COMMAND_PREFIX) : null
  return { command: is_command && payload.message ? payload.message.extendedTextMessage.text : null };
};

export const is_command = (payload: PayloadMessage) => {
  const is_command = payload.message ? payload.message.conversation.startsWith(COMMAND_PREFIX) : null
  return { command: is_command && payload.message ? payload.message.conversation : null };
};

export const is_command_extended = (payload: ExtendedPayload) => {
  const is_command = payload.message ? payload.message.extendedTextMessage?.text.startsWith(COMMAND_PREFIX) : null
  return { command: is_command && payload.message ? payload.message.extendedTextMessage.text : null };
};

export const get_command = (payload: ExtendedWAMessageUpdate): BotCommand | undefined => {
  const { command } = is_command(payload);
  if (!command /* || payload.key.fromMe*/) return undefined;
  const [command_name, ...args] = command.replace(COMMAND_PREFIX, '').split(' ');
  return {
    command_name,
    args,
    groupId: payload.message && payload.message.senderKeyDistributionMessage?.groupId ? payload.message.senderKeyDistributionMessage?.groupId : payload.key.remoteJid ?? undefined,
    command_executor: payload.key.participant == '' ? payload.sender : payload.key.participant ?? undefined
  };
};

export const get_command_extended = (payload: ExtendedWAMessageUpdate): BotCommand | undefined => {
  const { command } = is_command_extended(payload);
  if (!command /* || payload.key.fromMe*/) return undefined;
  const command_name = command.replace(COMMAND_PREFIX, '');
  return {
    command_name,
    args: payload.message?.extendedTextMessage.contextInfo.participant,
    groupId: payload.message && payload.message.senderKeyDistributionMessage?.groupId ? payload.message.senderKeyDistributionMessage?.groupId : payload.key.remoteJid ?? undefined,
    command_executor: payload.key.participant == '' ? payload.sender && payload.sender != 'unknown' ? payload.sender : payload.msg?.contextInfo?.participant : payload.key.participant ?? undefined
  };
};

export const get_command_mention = (payload: ExtendedWAMessageUpdate): BotCommand | undefined => {
  const { command } = is_command_mention(payload);
  if (!command /* || payload.key.fromMe*/) return undefined;
  const command_name = command.replace(COMMAND_PREFIX, '').split(' ')[0];
  return {
    command_name,
    args: payload.message?.extendedTextMessage.contextInfo.mentionedJid,
    groupId: payload.message && payload.message.senderKeyDistributionMessage?.groupId ? payload.message.senderKeyDistributionMessage?.groupId : payload.key.remoteJid ?? undefined,
    command_executor: payload.key.participant == '' ? payload.sender : payload.key.participant ?? undefined
  };
};


export type Method = "mention" | "reply" | "raw"
export type validateCommandProps = { method: Method }
/**
 * BaseCommand
 * @description Base class for all commands for enforcing a common interface
 */
export abstract class BaseCommand implements BotCommand {
  command_name: string;
  args: any[] | undefined;
  groupId: string | undefined;
  command_executor: string | undefined;
  constructor(receivedMessage: ExtendedWAMessageUpdate) {
    this.command_name = receivedMessage.command?.command_name || '';
    this.args = receivedMessage.command?.args;
    this.groupId = receivedMessage.command?.groupId;
    this.command_executor = receivedMessage.command?.command_executor;
  }
  abstract execute(message: ExtendedWAMessageUpdate): Promise<void>;
  abstract validateCommand(props: validateCommandProps): Promise<GroupMetadata | null>;
}
