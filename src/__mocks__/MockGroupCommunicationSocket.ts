import { ChatUpdateStatus, GroupCommunicationSocket } from "../sockets"
import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";

export class MockGroupCommunicationSocket implements GroupCommunicationSocket {
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
