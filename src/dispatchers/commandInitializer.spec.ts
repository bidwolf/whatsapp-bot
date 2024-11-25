import { MockCommand } from "../__mocks__/MockCommand"
import { MockCommandFactory } from "../__mocks__/MockCommandFactory"
import { MockCommandRegistry } from "../__mocks__/MockCommandRegistry"
import { MockGroupCommunicationSocket } from "../__mocks__/MockGroupCommunicationSocket"
import { MockMessage } from "../__mocks__/MockMessage"
import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { CommandInitializer, ICommandInitializer } from "./commandInitializer"

const makeSut = (availableCommandName: string): {
  sut: ICommandInitializer<IMessage>,
  registry: MockCommandRegistry
} => {
  const mockedGroupSocket = new MockGroupCommunicationSocket()
  const command = new MockCommand(availableCommandName)
  const mockedFactory = new MockCommandFactory(command)
  const factoryList: ICommandFactory<IMessage>[] = [
    mockedFactory
  ]
  const registry = new MockCommandRegistry(factoryList)
  const sut = new CommandInitializer(registry, mockedGroupSocket)
  return { sut, registry }
}
describe('Command initializer', () => {
  it('should initialize a command', () => {
    const availableCommandName = 'test'
    const { sut, registry } = makeSut(availableCommandName)
    const mockedMessage = new MockMessage()
    mockedMessage.assignCommandName(availableCommandName)
    const command = sut.initializeCommand(mockedMessage)
    expect(registry.called).toBe(true)
    expect(command).toBeDefined()
    expect(command?.name).toBe(availableCommandName)
  })
  it('should return undefined when command is not present on registry', () => {
    const availableCommandName = 'test'
    const commandNameUnavailableOnRegistry = 'unavailable'
    const { sut, registry } = makeSut(availableCommandName)
    const mockedMessage = new MockMessage()
    mockedMessage.assignCommandName(commandNameUnavailableOnRegistry)
    const command = sut.initializeCommand(mockedMessage)
    expect(registry.called).toBe(true)
    expect(command).toBeUndefined()
  })
  it('should return undefined when message is not a command', () => {
    const availableCommandName = 'test'
    const { sut, registry } = makeSut(availableCommandName)
    const mockedMessage = new MockMessage()
    const command = sut.initializeCommand(mockedMessage)
    expect(registry.called).toBe(false)
    expect(command).toBeUndefined()
  })
})
