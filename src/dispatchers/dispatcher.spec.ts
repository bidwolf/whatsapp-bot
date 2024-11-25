import { Logger } from "pino"
import { CommandDispatcher } from "."
import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { ChatUpdateStatus, GroupCommunicationSocket } from "../sockets"
import { GroupMetadata } from "@whiskeysockets/baileys"
import { MockCommandFactory } from "../__mocks__/MockCommandFactory"
import { MockCommandRegistry } from "../__mocks__/MockCommandRegistry"
import { MockMessage } from "../__mocks__/MockMessage"
import { CommandInitializer } from "./commandInitializer"
import { MockCommand } from "../__mocks__/MockCommand"
class GroupCommunicationSocketMock implements GroupCommunicationSocket {
  async getMetadata(groupId: string): Promise<GroupMetadata | undefined> {
    return undefined
  }
  async addUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return [{
      jid: '',
      status: ''
    }]
  }
  async removeUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return [{
      jid: '',
      status: ''
    }]
  }
  async sendInvite(inviteCode: string | undefined, participantId: string, subject: string, groupId: string): Promise<void> { }
  async getGroupInvite(groupId: string): Promise<string | undefined> {
    return undefined
  }
  async revokeInvite(groupId: string): Promise<string | undefined> {
    return undefined
  }
  async promoteUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return [{
      jid: '',
      status: ''
    }]
  }
  async demoteUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return [{
      jid: '',
      status: ''
    }]
  }
  async deleteMessageFromGroup(groupId: string, message: { id: string; participant: string }): Promise<{ [k: string]: any } | undefined> {
    return undefined
  }
  async updateGroupDescription(groupId: string, description: string): Promise<void> { }
  async renameGroup(groupId: string, newGroupTitle: string): Promise<void> { }
  async updateBotStatus(newStatus: string): Promise<void> { }
  async mentionAll(groupId: string): Promise<{ [k: string]: any } | undefined> {
    return undefined
  }
  async restrictGroupMessagesToAdmin(groupId: string): Promise<void> { }
  async enableGroupMessagesToAll(groupId: string): Promise<void> { }
  async sendMessage(groupId: string, message: string): Promise<{ [k: string]: any } | undefined> {
    return undefined
  }

}

describe('Dispatch', () => {
  const availableCommandName = 'validCommand'
  const simulateErrorCommandName = 'errorCommand'
  const makeSut = (message: IMessage) => {
    const instance = new GroupCommunicationSocketMock()
    const command = new MockCommand(availableCommandName)
    const errorCommand = new MockCommand(simulateErrorCommandName)
    errorCommand.shouldThrow(true)
    const mockedFactory = new MockCommandFactory(command)
    const errorMockedFactory = new MockCommandFactory(errorCommand)
    const factoryList: ICommandFactory<IMessage>[] = [
      mockedFactory,
      errorMockedFactory
    ]
    const commandRegistry = new MockCommandRegistry(factoryList)
    const commandInitializer = new CommandInitializer(commandRegistry, instance)
    const logger = {
      info: jest.fn(),
      error: jest.fn()
    } as unknown as Logger
    const sut = new CommandDispatcher(message, commandInitializer, logger)

    return {
      CommandInitializer,
      commandRegistry,
      mockedFactory,
      logger,
      sut
    }
  }
  it('should be able to dispatch a command', async () => {
    // Arrange
    const message: IMessage = {} as IMessage
    const { sut } = makeSut(message)
    jest.spyOn(sut, 'dispatchCommand')
    // Act
    await sut.dispatchCommand()
    // Assert
    expect(sut).toBeDefined()
    expect(sut).toBeInstanceOf(CommandDispatcher)
    expect(sut.dispatchCommand).toBeDefined()
    expect(sut.dispatchCommand).toHaveBeenCalled()
  }
  )
  it('should log an info when the command is not found', async () => {
    //Arrange
    const invalidCommandMessage = new MockMessage()
    const { sut, logger } = makeSut(invalidCommandMessage)
    //Act
    await sut.dispatchCommand()
    //Assert
    expect(logger.info).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('No command found in message')
  })
  it('should call run function when command exists', async () => {
    //Arrange
    const validCommandMessage = new MockMessage()
    validCommandMessage.assignCommandName(availableCommandName)
    const { sut, mockedFactory } = makeSut(validCommandMessage)
    //Act
    await sut.dispatchCommand()
    //Assert
    expect(mockedFactory.isCommandRun()).toBe(true)
  })
  it('should log an error when the command throw a error', async () => {
    //Arrange
    const testErrorMessage = new MockMessage()
    testErrorMessage.assignCommandName(simulateErrorCommandName)
    const { sut, logger } = makeSut(testErrorMessage)
    //Act
    await sut.dispatchCommand()
    //Assert
    expect(logger.error).toHaveBeenCalled()
  })
})
