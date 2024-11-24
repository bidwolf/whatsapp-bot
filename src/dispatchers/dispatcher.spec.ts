import { Logger } from "pino"
import { CommandDispatcher } from "."
import { ICommandFactory } from "../commands"
import { IMessage } from "../messages"
import { ChatUpdateStatus, GroupCommunicationSocket } from "../sockets"
import { GroupMetadata } from "@whiskeysockets/baileys"
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
  const logger = {
    info: jest.fn(),
    error: jest.fn()
  } as unknown as Logger
  const instance = new GroupCommunicationSocketMock()
  const availableCommands: ICommandFactory<IMessage>[] = [
  ]
  it('should be able to dispatch a command', async () => {
    // Arrange
    const message: IMessage = {} as IMessage
    const sut = new CommandDispatcher(instance, message, availableCommands, logger)
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

})
