import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { AvailableCommandPlatform, IMessage } from "../messages"
import { BotCommand, Method } from "../utils/commands"

export class MockMessage implements IMessage {
  platform = AvailableCommandPlatform.WHATSAPP
  content: string = 'test content'
  senderId: string = 'senderID'
  command?: BotCommand | undefined
  groupMetadata?: GroupMetadata | undefined
  method?: Method | undefined
  assignCommandName(commandName: string) {
    this.command = {
      args: '',
      command_executor: '',
      command_name: commandName,
      groupId: ''
    }
  }
}
