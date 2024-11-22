import { type BinaryNode } from "@whiskeysockets/baileys/lib/WABinary/types";
import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";

export type ChatUpdateStatus = {
  status: string;
  jid: string;
  content?: BinaryNode;
};

type MessageParticipant = {
  id: string;
  participant: string;
};

export type GroupCommunicationSocket = {
  getMetadata: (groupId: string) => Promise<GroupMetadata | undefined>;
  addUser: (groupId: string, participantId: string) => Promise<ChatUpdateStatus[]>;
  removeUser: (groupId: string, participantId: string) => Promise<ChatUpdateStatus[]>;
  sendInvite: (inviteCode: string | undefined, participantId: string, subject: string, groupId: string) => Promise<void>;
  getGroupInvite: (groupId: string) => Promise<string | undefined>;
  revokeInvite: (groupId: string) => Promise<string | undefined>;
  promoteUser: (groupId: string, participantId: string) => Promise<ChatUpdateStatus[]>;
  demoteUser: (groupId: string, participantId: string) => Promise<ChatUpdateStatus[]>;
  deleteMessageFromGroup: (groupId: string, message: MessageParticipant) => Promise<{ [k: string]: any } | undefined>;
  updateGroupDescription: (groupId: string, description: string) => Promise<void>;
  renameGroup: (groupId: string, newGroupTitle: string) => Promise<void>;
  updateBotStatus: (newStatus: string) => Promise<void>;
  mentionAll: (groupId: string) => Promise<{ [k: string]: any } | undefined>
  restrictGroupMessagesToAdmin: (groupId: string) => Promise<void>;
  enableGroupMessagesToAll: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, message: string) => Promise<{ [k: string]: any } | undefined>;
}
