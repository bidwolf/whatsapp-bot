import { MockFactory } from "../__mocks__/MockFactory"
import { MockGroupCommunicationSocket } from "../__mocks__/MockGroupCommunicationSocket"
import { MockMessage } from "../__mocks__/MockMessage"
import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { CommandRegistry } from "./CommandRegistry"

describe('Command Registry', () => {

  it('should throw a error when try to get a command with a message without a command on it', async () => {
    //Arrange
    const availableCommandName = 'test'
    const unavailableCommandName = 'unavailableCommand'
    const messageWithoutCommand = new MockMessage()
    const mockedGroupSocket = new MockGroupCommunicationSocket()
    const factoryList: ICommandFactory<IMessage>[] = [
      new MockFactory(availableCommandName)
    ]
    const sut = new CommandRegistry(messageWithoutCommand, mockedGroupSocket, factoryList)
    //Act
    const registerCommands = async () => {
      await sut.getCommand(unavailableCommandName)
    }
    //assert
    await expect(registerCommands()).rejects.toThrow('command not exists')
  })
  it('should return undefined when try to get a inexistent command with a message with a command on it', async () => {
    //Arrange
    const availableCommandName = 'test'
    const unavailableCommandName = 'unavailableCommand'
    const mockMessage = new MockMessage()
    mockMessage.setCommandAvailable(availableCommandName)
    const mockedGroupSocket = new MockGroupCommunicationSocket()
    const factoryList: ICommandFactory<IMessage>[] = []
    const commandRegistry = new CommandRegistry(mockMessage, mockedGroupSocket, factoryList)
    //Act
    const command = await commandRegistry.getCommand(unavailableCommandName)
    //Assert
    expect(command).toBeUndefined()
  })
})
