import { AvailableCommandPlatform, IMessage } from ".";
import { BotCommand, Method } from "../utils/commands";
import { ExtendedWAMessageUpdate } from "../utils/messageTransformer";

export class WhatsAppMessage implements IMessage {
  platform = AvailableCommandPlatform.WHATSAPP;
  content: string;
  senderId: string;
  commandExecutor?: string
  groupId?: string
  vcard?: string
  method?: Method
  command?: BotCommand
  quoted?: { id: string }
  constructor(socketMessage: ExtendedWAMessageUpdate) {
    this.content = socketMessage.text || '';
    this.senderId = socketMessage.sender || '';
    this.commandExecutor = socketMessage.command?.command_executor
    this.groupId = socketMessage.command?.groupId
    this.vcard = socketMessage.quoted?.vcard
    this.method = socketMessage.method
    this.command = socketMessage.command
    this.quoted = socketMessage.quoted
  }
}
