import { BaileysEventEmitter, Chat, ConnectionState, Contact, GroupMetadata, PresenceData, proto, WAMessage, WAMessageCursor, WAMessageKey, WASocket } from "@whiskeysockets/baileys";
import type KeyedDB from '@adiwajshing/keyed-db';
import { ObjectRepository } from "@whiskeysockets/baileys/lib/Store/object-repository";
import { Label } from "@whiskeysockets/baileys/lib/Types/Label";
import { LabelAssociation } from "@whiskeysockets/baileys/lib/Types/LabelAssociation";
export type TBaileysInMemoryStore = {
  chats: KeyedDB<Chat, string>;
  contacts: {
    [_: string]: Contact;
  };
  messages: {
    [_: string]: {
      array: proto.IWebMessageInfo[];
      get: (id: string) => proto.IWebMessageInfo | undefined;
      upsert: (item: proto.IWebMessageInfo, mode: "append" | "prepend") => void;
      update: (item: proto.IWebMessageInfo) => boolean;
      remove: (item: proto.IWebMessageInfo) => boolean;
      updateAssign: (id: string, update: Partial<proto.IWebMessageInfo>) => boolean;
      clear: () => void;
      filter: (contain: (item: proto.IWebMessageInfo) => boolean) => void;
      toJSON: () => proto.IWebMessageInfo[];
      fromJSON: (newItems: proto.IWebMessageInfo[]) => void;
    };
  };
  groupMetadata: {
    [_: string]: GroupMetadata;
  };
  state: ConnectionState;
  presences: {
    [id: string]: {
      [participant: string]: PresenceData;
    };
  };
  labels: ObjectRepository<Label>;
  labelAssociations: KeyedDB<LabelAssociation, string>;
  bind: (ev: BaileysEventEmitter) => void;
  loadMessages: (jid: string, count: number, cursor: WAMessageCursor) => Promise<proto.IWebMessageInfo[]>;
  getLabels: () => ObjectRepository<Label>;
  getChatLabels: (chatId: string) => LabelAssociation[];
  getMessageLabels: (messageId: string) => string[];
  loadMessage: (jid: string, id: string) => Promise<proto.IWebMessageInfo | undefined>;
  mostRecentMessage: (jid: string) => Promise<proto.IWebMessageInfo>;
  fetchImageUrl: (jid: string, sock: WASocket | undefined) => Promise<string | null | undefined>;
  fetchGroupMetadata: (jid: string, sock: WASocket | undefined) => Promise<GroupMetadata>;
  fetchMessageReceipts: ({ remoteJid, id }: WAMessageKey) => Promise<proto.IUserReceipt[] | null | undefined>;
  toJSON: () => {
    chats: KeyedDB<Chat, string>;
    contacts: {
      [_: string]: Contact;
    };
    messages: {
      [_: string]: {
        array: proto.IWebMessageInfo[];
        get: (id: string) => proto.IWebMessageInfo | undefined;
        upsert: (item: proto.IWebMessageInfo, mode: "append" | "prepend") => void;
        update: (item: proto.IWebMessageInfo) => boolean;
        remove: (item: proto.IWebMessageInfo) => boolean;
        updateAssign: (id: string, update: Partial<proto.IWebMessageInfo>) => boolean;
        clear: () => void;
        filter: (contain: (item: proto.IWebMessageInfo) => boolean) => void;
        toJSON: () => proto.IWebMessageInfo[];
        fromJSON: (newItems: proto.IWebMessageInfo[]) => void;
      };
    };
    labels: ObjectRepository<Label>;
    labelAssociations: KeyedDB<LabelAssociation, string>;
  };
  fromJSON: (json: {
    chats: Chat[];
    contacts: {
      [id: string]: Contact;
    };
    messages: {
      [id: string]: proto.IWebMessageInfo[];
    };
    labels: {
      [labelId: string]: Label;
    };
    labelAssociations: LabelAssociation[];
  }) => void;
  writeToFile: (path: string) => void;
  readFromFile: (path: string) => void;
};
