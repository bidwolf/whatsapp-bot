import { MockCommand } from "../__mocks__/MockCommand"
import { MockCommandFactory } from "../__mocks__/MockCommandFactory"
import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { CommandRegistry } from "./CommandRegistry"

describe('Command Registry', () => {
  const makeSut = (commandName: string) => {
    const command = new MockCommand(commandName)
    const mockedFactory = new MockCommandFactory(command)
    const factoryList: ICommandFactory<IMessage>[] = [
      mockedFactory
    ]
    const sut = new CommandRegistry(factoryList)
    return {
      mockedFactory,
      sut
    }
  }
  it('should register a command list', () => {
    const availableCommandName = 'test'
    const { mockedFactory } = makeSut(availableCommandName)
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
    const { sut } = makeSut(availableCommandName)
    //Act
    const factory = sut.getFactory(availableCommandName)
    //Assert
    expect(factory).toBeDefined()
    expect(factory?.getCommandName()).toBe(availableCommandName)
  })
})
