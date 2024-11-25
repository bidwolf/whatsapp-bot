import { MockCommandFactory } from "../__mocks__/MockCommandFactory"
import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { CommandRegistry } from "./CommandRegistry"

describe('Command Registry', () => {
  it('should register a command list', () => {
    const availableCommandName = 'test'
    const mockedFactory = new MockCommandFactory(availableCommandName)
    const factoryList: ICommandFactory<IMessage>[] = [
      mockedFactory
    ]
    const commandRegistry = new CommandRegistry(factoryList)
    expect(mockedFactory.called).toBe(true)
  })
  it('should return undefined when try to get a inexistent factory with a message with a command on it', async () => {
    //Arrange
    const unavailableCommandName = 'unavailableCommand'
    const factoryList: ICommandFactory<IMessage>[] = []
    const commandRegistry = new CommandRegistry(factoryList)
    //Act
    const factory = commandRegistry.getFactory(unavailableCommandName)
    //Assert
    expect(factory).toBeUndefined()
  })
  it('should return a factory when the command currently exists', async () => {
    //arrange
    const availableCommandName = 'test'
    const mockedCommand = new MockCommandFactory(availableCommandName)
    const factoryList: ICommandFactory<IMessage>[] = [
      mockedCommand
    ]
    const commandRegistry = new CommandRegistry(factoryList)
    //Act
    const factory = commandRegistry.getFactory(availableCommandName)
    //Assert
    expect(factory).toBeDefined()
    expect(factory?.getCommandName()).toBe(availableCommandName)
  })
})
