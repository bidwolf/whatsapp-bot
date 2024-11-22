import { AvailableCommandPlatform, IMessage } from ".";
import { BotCommand, Method } from "../utils/commands";
import { ExtendedWAMessageUpdate } from "../utils/messageTransformer";
import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";

export class WhatsAppMessage implements IMessage {
  platform = AvailableCommandPlatform.WHATSAPP;
  content: string;
  senderId: string;
  commandExecutor?: string
  groupId?: string
  vcard?: string
  groupMetadata?: GroupMetadata
  method?: Method
  command?: BotCommand
  quoted?: { id: string }
  constructor(socketMessage: ExtendedWAMessageUpdate) {
    this.content = socketMessage.text || '';
    this.senderId = socketMessage.sender || '';
    this.commandExecutor = socketMessage.command?.command_executor
    this.groupId = socketMessage.command?.groupId
    this.groupMetadata = socketMessage.groupMetadata
    this.vcard = socketMessage.quoted?.vcard
    this.method = socketMessage.method
    this.command = socketMessage.command
    this.quoted = socketMessage.quoted
  }
}
