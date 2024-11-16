
import { proto, getContentType, WAMessageUpdate, WASocket, AnyMessageContent } from "@whiskeysockets/baileys"
import pino from 'pino';
import fs from 'fs';
import axios from 'axios';
import moment from 'moment-timezone';
import { sizeFormatter } from 'human-readable';
import Jimp from 'jimp';
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
const unixTimestampSeconds = (date: Date = new Date()): number => Math.floor(date.getTime() / 1000);

export const generateMessageTag = (epoch?: string): string => {
  let tag = unixTimestampSeconds().toString();
  if (epoch) tag += '.--' + epoch; // attach epoch if provided
  return tag;
};
export const processTime = (timestamp: number, now: number): number => {
  return moment.duration(now - moment(timestamp * 1000).milliseconds()).asSeconds();
};
export const getRandom = (ext: string): string => {
  return `${Math.floor(Math.random() * 10000)}${ext}`;
};
export const getBuffer = async (url: string, options?: object): Promise<Buffer | Error> => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: {
        'DNT': 1,
        'Upgrade-Insecure-Request': 1
      },
      ...options,
      responseType: 'arraybuffer'
    });
    return res.data;
  } catch (err) {
    return err as Error;
  }
};
export const fetchJson = async (url: string, options?: object): Promise<any> => {
  try {
    const res = await axios({
      method: 'GET',
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      },
      ...options
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

export const runtime = (seconds: number): string => {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
};
export const clockString = (ms: number): string => {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};
export const sleep = async (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
export const isUrl = (url: string): boolean => {
  return !!url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};
export const getTime = (format: string, date?: Date): string => {
  if (date) {
    return moment(date).locale('id').format(format);
  } else {
    return moment.tz('Asia/Jakarta').locale('id').format(format);
  }
};
export const formatDate = (n: number, locale: string = 'id'): string => {
  const d = new Date(n);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
};
export const dataBrasil = (timestamp: number): string => {
  const monthsBR = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysOfWeekBR = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const data = new Date(timestamp);
  const currentDate = data.getDate();
  const currentMonth = data.getMonth();
  const dayOfWeekInPortuguese = daysOfWeekBR[data.getDay()];
  const year = data.getFullYear();
  return `${dayOfWeekInPortuguese}, ${currentDate} de ${monthsBR[currentMonth]} de ${year}`;
};
export const formatSize = sizeFormatter({
  std: 'SI', // 'SI' = default | 'IEC' | 'JEDEC'
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal.replace('.', ',')} ${symbol}B`,
});
export const convertToJson = (string: any): string => {
  return JSON.stringify(string, null, 2);
};
export const generateProfilePicture = async (buffer: Buffer): Promise<{ img: Buffer, preview: Buffer }> => {
  const jimp = await Jimp.Jimp.read(buffer);
  const min = jimp.width;
  const max = jimp.height
  const cropped = jimp.crop({ x: 0, y: 0, w: min, h: max });
  return {
    img: await cropped.scaleToFit({ h: 720, w: 720 }).getBuffer(Jimp.JimpMime.jpeg),
    preview: await cropped.scaleToFit({ h: 720, w: 720 }).getBuffer(Jimp.JimpMime.jpeg)
  };
};
export const bytesToSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
export const getSizeMedia = (path: string | Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (/http/.test(path.toString())) {
      axios.get(path.toString())
        .then((res) => {
          const length = parseInt(res.headers['content-length']);
          const size = bytesToSize(length, 3);
          if (!isNaN(length)) resolve(size);
        });
    } else if (Buffer.isBuffer(path)) {
      const length = Buffer.byteLength(path);
      const size = bytesToSize(length, 3);
      if (!isNaN(length)) resolve(size);
    } else {
      reject('Não foi possível obter o tamanho da mídia. Verifique se o caminho está correto e tente novamente.');
    }
  });
};
export const parseMention = (text: string = ''): string[] => {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

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
