import { ChatUpdateStatus, GroupCommunicationSocket } from ".";
import { INVITE_TEMPLATE } from "../utils/constants";
import { ExtendedWaSocket } from "../utils/messageTransformer";
import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";

export class WhatsAppGroupSocket implements GroupCommunicationSocket {
  constructor(private readonly socket: ExtendedWaSocket) { }
  async updateGroupDescription(groupId: string, description: string): Promise<void> {
    return this.socket.groupUpdateDescription(groupId, description)
  }
  async restrictGroupMessagesToAdmin(groupId: string): Promise<void> {
    return this.socket.groupSettingUpdate(groupId, 'announcement')
  }
  async enableGroupMessagesToAll(groupId: string): Promise<void> {
    return this.socket.groupSettingUpdate(groupId, 'not_announcement')
  }
  async updateBotStatus(newStatus: string): Promise<void> {

    return this.socket.updateProfileStatus(newStatus)
  }
  async renameGroup(groupId: string, description: string): Promise<void> {
    return this.socket.groupUpdateSubject(groupId, description)
  }
  async deleteMessageFromGroup(groupId: string, message: { id: string; participant: string; }): Promise<{ [k: string]: any } | undefined> {
    const fromMe = this.socket.user?.id === message.participant
    const response = await this.socket.sendMessage(groupId, {
      delete: {
        remoteJid: groupId,
        fromMe: fromMe,
        id: message.id,
        participant: message.participant,
      }, force: true,
    })
    if (response) {
      return response.toJSON()
    }
  };
  async mentionAll(groupId: string): Promise<{ [k: string]: any } | undefined> {
    const groupMetadata = await this.getMetadata(groupId)
    if (!groupMetadata) return undefined
    let mentionText = ''
    const mentions = groupMetadata.participants.map(p => {

      mentionText += `@${p.id.split('@')[0]} `
      return p.id
    })
    const message = await this.socket.sendMessage(groupMetadata.id, {
      text: mentionText,
      mentions: mentions
    })
    if (message) {
      return message.toJSON()
    }
  };
  async promoteUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return await this.socket.groupParticipantsUpdate(
      groupId,
      [participantId],
      'promote'
    )
  }
  async demoteUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return this.socket.groupParticipantsUpdate(
      groupId,
      [participantId],
      'demote'
    )
  }
  async getMetadata(groupId: string): Promise<GroupMetadata | undefined> {
    try {
      return this.socket.groupMetadata(groupId)

    } catch (error) {
      return undefined
    }
  };
  async addUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return this.socket.groupParticipantsUpdate(
      groupId,
      [participantId],
      'add'
    )
  }
  async removeUser(groupId: string, participantId: string): Promise<ChatUpdateStatus[]> {
    return this.socket.groupParticipantsUpdate(
      groupId,
      [participantId],
      'remove'
    )
  }
  async sendInvite(inviteCode: string | undefined, participantId: string, groupId: string, subject: string): Promise<void> {
    const inviteLink = inviteCode ? inviteCode : await this.getGroupInvite(groupId)
    if (inviteLink) {
      await this.socket.sendMessage(
        participantId,
        { text: INVITE_TEMPLATE(subject, inviteLink) }
      );
    }
  }
  async getGroupInvite(groupId: string): Promise<string | undefined> {
    const inviteCode = await this.socket.groupInviteCode(groupId)
    return inviteCode
  }
  async revokeInvite(groupId: string): Promise<string | undefined> {
    const inviteCode = await this.socket.groupRevokeInvite(groupId)
    return inviteCode
  }
}
