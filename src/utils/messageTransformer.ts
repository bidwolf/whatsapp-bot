
import { proto, getContentType, WAMessageUpdate, WASocket, AnyMessageContent } from "@whiskeysockets/baileys"
import pino from 'pino';
import fs from 'fs';
import { MessageFilter } from "./MessageFilter";
import {
  CommandExtractor, Method, type BotCommand
} from "./commands";
import { TBaileysInMemoryStore } from "../api/class/BaileysInMemoryStore";

export type MSG = proto.IMessage & {
  contextInfo?: proto.ContextInfo;
  caption: any;
  text?: string;
  singleSelectedReply?: any;
  selectedButtonId?: any;
  selectedRowId?: any;
  contentText?: any;
  title?: any;
  conversation?: any;
  productMessage?: any;
  buttonsResponseMessage?: any;
  listResponseMessage?: any;
  viewOnceMessage?: any;
  singleSelectReply?: any;
  selectedDisplayText?: any;
  quotedMessage?: any;
  url?: string;
  directPath?: string;
  mediaKey?: string;

}
export type MessageReply = (text: string | Buffer, chatId?: string, options?: object) => Promise<any>;
export type ExtendedWAMessageUpdate = WAMessageUpdate & proto.WebMessageInfo & {
  id?: string | null;
  isBaileys?: boolean;
  chat: string;
  fromMe?: boolean | null;
  isGroup?: boolean;
  sender?: string;
  participant?: string;
  mtype?: string;
  msg?: MSG;
  message?: any
  body?: string;
  quoted?: any;
  mentionedJid?: string[];
  download?: () => Promise<Buffer>;
  text?: string;
  reply?: (text: string | Buffer, chatId?: string, options?: object) => Promise<any>;
  copy?: () => ExtendedWAMessageUpdate;
  copyNForward?: (jid?: string, forceForward?: boolean, options?: object) => Promise<any>;
  getQuotedObj?: () => Promise<ExtendedWAMessageUpdate | false>;
  getQuotedMessage?: () => Promise<ExtendedWAMessageUpdate | false>;
  // getInviteCodeGroup?: (groupId: string) => Promise<string | null>;
  command: BotCommand | undefined;
  method?: Method
  isOffensive?: boolean;
  delete?: () => Promise<any>;
};
export interface ExtendedWaSocket extends WASocket {
  copyNForward: (jid: string, message: any, forceForward: boolean, options: object) => Promise<any>;
  downloadMediaMessage: (message: any) => Promise<Buffer>;
  sendMedia: (jid: string, buffer: Buffer, type: string, filename: string, message: any, options: object) => Promise<any>;
}
export const transformMessageUpdate = (conn: ExtendedWaSocket, messageUpdate: ExtendedWAMessageUpdate, store: TBaileysInMemoryStore): ExtendedWAMessageUpdate => {
  if (!messageUpdate) return messageUpdate;
  const M = proto.WebMessageInfo;
  const decodeJid = (jid: string | null | undefined): string => {
    if (!jid) return 'unknown';
    if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@call')) {
      return jid;
    }
    return 'unknown';
  };

  if (messageUpdate.key) {
    messageUpdate.id = messageUpdate.key.id;
    messageUpdate.isBaileys = messageUpdate?.id?.startsWith('BAE5') && messageUpdate.id.length === 16;
    messageUpdate.chat = messageUpdate.key.remoteJid || messageUpdate.key.participant || messageUpdate.key.fromMe && conn?.user?.id || '';
    messageUpdate.fromMe = messageUpdate.key.fromMe;
    messageUpdate.isGroup = messageUpdate?.chat?.endsWith('@g.us');
    messageUpdate.sender = decodeJid(messageUpdate.fromMe && conn?.user?.id || messageUpdate.participant || messageUpdate.key.participant || messageUpdate.chat || '');
    if (messageUpdate.isGroup) messageUpdate.participant = decodeJid(messageUpdate.key.participant) || '';
  }

  if (messageUpdate.message) {
    messageUpdate.mtype = getContentType(messageUpdate.message);
    const contentTypeOnce = messageUpdate?.mtype && messageUpdate.mtype == 'viewOnceMessage' ? getContentType(messageUpdate.message[messageUpdate?.mtype]) : null;
    messageUpdate.msg = messageUpdate.mtype == 'viewOnceMessage' && messageUpdate.message[messageUpdate.mtype] && contentTypeOnce ? messageUpdate.message[messageUpdate.mtype].message[contentTypeOnce] : messageUpdate?.mtype ? messageUpdate.message[messageUpdate.mtype] : null;
    if (messageUpdate.msg?.text === '') return messageUpdate;
    messageUpdate.body = messageUpdate.message.conversation || messageUpdate.msg?.caption || messageUpdate.msg?.text || (messageUpdate.mtype == 'listResponseMessage' && messageUpdate.msg?.singleSelectReply?.selectedRowId) || (messageUpdate.mtype == 'buttonsResponseMessage' && messageUpdate.msg?.selectedButtonId) || (messageUpdate.mtype == 'viewOnceMessage' && messageUpdate.msg?.caption) || messageUpdate.text;
    const quoted = messageUpdate.quoted = messageUpdate.msg?.contextInfo ? messageUpdate.msg?.contextInfo?.quotedMessage : null;
    messageUpdate.mentionedJid = messageUpdate.msg?.contextInfo ? messageUpdate.msg?.contextInfo?.mentionedJid : [];
    if (messageUpdate.quoted && quoted) {
      let type = getContentType(quoted);
      if (type) {
        messageUpdate.quoted = messageUpdate.quoted[type];
        if (['productMessage'].includes(type)) {
          type = getContentType(messageUpdate.quoted);
          if (type) {
            messageUpdate.quoted = messageUpdate.quoted[type];
          }
        }
      }
      if (typeof messageUpdate.quoted === 'string') messageUpdate.quoted = {
        text: messageUpdate.quoted
      };
      messageUpdate.quoted.mtype = type;
      messageUpdate.quoted.id = messageUpdate.msg?.contextInfo?.stanzaId;
      messageUpdate.quoted.chat = messageUpdate.msg?.contextInfo?.remoteJid || messageUpdate.chat;
      messageUpdate.quoted.isBaileys = messageUpdate.quoted.id ? messageUpdate.quoted.id.startsWith('BAE5') && messageUpdate.quoted.id.length === 16 : false;
      messageUpdate.quoted.sender = decodeJid(messageUpdate.msg?.contextInfo?.participant);
      messageUpdate.quoted.fromMe = messageUpdate.quoted.sender === (conn.user && conn.user.id);
      messageUpdate.quoted.text = messageUpdate.quoted.text || messageUpdate.quoted.caption || messageUpdate.quoted.conversation || messageUpdate.quoted.contentText || messageUpdate.quoted.selectedDisplayText || messageUpdate.quoted.title || '';
      messageUpdate.quoted.mentionedJid = messageUpdate.msg?.contextInfo ? messageUpdate.msg?.contextInfo?.mentionedJid : [];
      messageUpdate.getQuotedObj = messageUpdate.getQuotedMessage = async () => {
        if (!messageUpdate.quoted.id) return false;
        const q = await store.loadMessage(messageUpdate.chat, messageUpdate.quoted.id) as ExtendedWAMessageUpdate;
        if (!q) return false;
        return transformMessageUpdate(conn, q, store);
      };
      const vM = messageUpdate.quoted.fakeObj = M.fromObject({
        key: {
          remoteJid: messageUpdate.quoted.chat,
          fromMe: messageUpdate.quoted.fromMe,
          id: messageUpdate.quoted.id
        },
        message: quoted,
        ...(messageUpdate.isGroup ? { participant: messageUpdate.quoted.sender } : {})
      });
      messageUpdate.quoted.delete = () => conn.sendMessage(messageUpdate.chat, {
        delete: {
          remoteJid: messageUpdate.chat,
          fromMe: messageUpdate.quoted.fromMe,
          id: messageUpdate.quoted.id,
          participant: messageUpdate.quoted.sender,
        }
      });

      messageUpdate.quoted.copyNForward = (jid: string, forceForward: boolean = false, options: object = {}) => conn.copyNForward(jid, vM, forceForward, options);

      messageUpdate.quoted.download = () => conn.downloadMediaMessage(messageUpdate.quoted);
    }
  }

  if (messageUpdate.msg?.url) messageUpdate.download = () => conn.downloadMediaMessage(messageUpdate.msg);
  messageUpdate.text = messageUpdate.msg?.text || messageUpdate.msg?.caption || messageUpdate.message.conversation || messageUpdate.msg?.contentText || messageUpdate.msg?.selectedDisplayText || messageUpdate.msg?.title || '';

  messageUpdate.reply = (text: string | Buffer, chatId: string = messageUpdate.chat, options: object = {}) => Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', messageUpdate, { ...options }) : conn.sendMessage(chatId, { ...messageUpdate, text } as AnyMessageContent, { ...options });

  messageUpdate.copy = () => transformMessageUpdate(conn, M.fromObject(M.toObject(messageUpdate)) as unknown as ExtendedWAMessageUpdate, store);

  messageUpdate.copyNForward = (jid: string = messageUpdate.chat, forceForward: boolean = false, options: object = {}) => conn.copyNForward(jid, messageUpdate, forceForward, options);
  messageUpdate.delete = async () => {
    if (!messageUpdate.copy) return;
    const message = messageUpdate.copy()
    if (!message) return;
    return conn.sendMessage(message.chat, { delete: message.key, force: true });
  }
  const commandExtractor = new CommandExtractor(messageUpdate);
  const commandDetails = commandExtractor.retrieveCommandDetails();
  messageUpdate.command = commandDetails.command;
  messageUpdate.method = commandDetails.method;
  if (messageUpdate.text) messageUpdate.isOffensive = new MessageFilter().containsOffensiveLanguage(messageUpdate.text || '');
  return messageUpdate;
};

const file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  const logger = pino();
  console.log(logger.info(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
