import { BotCommand, Method } from "../utils/commands";
import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";

export interface IMessage {
  platform: AvailableCommandPlatform;
  content: string;
  senderId: string;
  command?: BotCommand;
  groupMetadata?: GroupMetadata
  method?: Method
}
export enum AvailableCommandPlatform {
  WHATSAPP = 'Whatsapp'
}
