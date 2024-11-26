import { ExtendedWAMessageUpdate } from "../utils/messageTransformer"
import { WhatsAppMessage } from "./WhatsappMessage"
import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";

describe('WhatsappMessage', () => {
  it('should have a platform property', () => {
    // Arrange
    const socketMessage: ExtendedWAMessageUpdate = {} as ExtendedWAMessageUpdate
    const message = new WhatsAppMessage(socketMessage)
    // Act
    const result = message.platform
    // Assert
    expect(result).toBe('Whatsapp')
  })
  it('should have vcard atribute when a extended message has a quoted vcard', () => {
    // Arrange
    const socketMessage: ExtendedWAMessageUpdate = {} as ExtendedWAMessageUpdate
    socketMessage.quoted = {
      message: {
        contactMessage: {
          vcard: 'this is a vcard'
        }
      },
    }
    const message = new WhatsAppMessage(socketMessage)
    // Act
    const result = message.vcard
    // Assert
    expect(result).toBe('this is a vcard')
  })
  it('should have command executor and groupId when the message is a command', () => {
    // Arrange
    const socketMessage: ExtendedWAMessageUpdate = {} as ExtendedWAMessageUpdate
    socketMessage.command = {
      args: 'argument',
      groupId: 'group-id',
      command_name: 'test',
      command_executor: 'tester'
    }
    const message = new WhatsAppMessage(socketMessage)
    // Act
    const result = message.command
    // Assert
    expect(result?.groupId).toBe('group-id')
    expect(result?.command_executor).toBe('tester')

  })
  it('should not have a method to sync group metadata when the extended message don\'t have it', () => {
    // Arrange
    const socketMessage: ExtendedWAMessageUpdate = {} as ExtendedWAMessageUpdate
    const message = new WhatsAppMessage(socketMessage)
    const result = message
    // Assert
    expect(result?.syncGroupMetadata).toBeUndefined()
  })
  it('should have a method to sync group metadata when the extended message have it', async () => {
    //Arrange
    const socketMessage: ExtendedWAMessageUpdate = {} as ExtendedWAMessageUpdate
    socketMessage.groupMetadata = { author: 'old author' } as GroupMetadata
    socketMessage.refreshGroupMetadata = async () => { return { author: 'new author' } as GroupMetadata }
    const message = new WhatsAppMessage(socketMessage)
    //Act
    //Assert
    expect(message.syncGroupMetadata).toBeDefined()
    expect(message.groupMetadata?.author).toBe('old author')
  })
  it('should update the groupMetadata on the message when syncGroupMetadata is called', async () => {
    //Arrange
    const socketMessage: ExtendedWAMessageUpdate = {} as ExtendedWAMessageUpdate
    socketMessage.groupMetadata = { author: 'old author' } as GroupMetadata
    socketMessage.refreshGroupMetadata = async () => { return { author: 'new author' } as GroupMetadata }
    const message = new WhatsAppMessage(socketMessage)
    //Act
    await message.syncGroupMetadata?.()
    //Assert
    expect(message.groupMetadata?.author).toBe('new author')
  })
})
