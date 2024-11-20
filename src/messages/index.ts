import { BotCommand, Method } from "../utils/commands";

export interface IMessage {
  platform: AvailableCommandPlatform;
  content: string;
  senderId: string;
  command?: BotCommand;
  method?: Method
}
export enum AvailableCommandPlatform {
  WHATSAPP = 'Whatsapp'
}
