import { ExtendedWAMessageUpdate } from "../utils/messageTransformer"
import { WhatsAppMessage } from "./WhatsappMessage"

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
      vcard: 'this is a vcard'
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
})
