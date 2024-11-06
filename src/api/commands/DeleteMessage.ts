import pino from 'pino';
import { BaseCommand, Method, validateCommandProps } from '../../utils/commands';
import { GroupMetadata } from '@whiskeysockets/baileys';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../class/messageTransformer';
import { TBaileysInMemoryStore } from '../class/BaileysInMemoryStore';
import { getWhatsAppId } from '../../utils/getWhatsappId';
import Group from '../models/group.model';
import Message from '../models/message.model';
import { group } from 'console';
export default class DeleteMessage extends BaseCommand {
  private readonly logger = pino()
  private readonly allowedMethods: Method[] = ['reply']
  async validateCommand(props: validateCommandProps): Promise<GroupMetadata | null> {
    if (!props.command.groupId) {
      throw new Error('Group ID not found')
    }
    if (props.command.command_executor == undefined) {
      throw new Error('Command executor not found')
    }

    const whatsAppId = getWhatsAppId(props.command.command_executor)

    // If the store is not available, use the socket to fetch the group metadata
    const groupMetadata = await props.instance.groupMetadata(props.command.groupId)
    if (!groupMetadata) return null
    const isAdmin = groupMetadata.participants.find(p => p.id === whatsAppId && p.admin)
    if (isAdmin) {
      if (!this.allowedMethods.includes(props.method)) {
        this.logger.info(
          `Method ${props.method} not allowed`
        )
      }
      return this.allowedMethods.includes(props.method) ? groupMetadata : null
    }
    return null
  }
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket, store?: TBaileysInMemoryStore): Promise<void> {
    if (!message.method) throw new Error('Method not found')
    if (!message.command) throw new Error('Command not found')
    const command = message.command
    if (!command.command_executor) throw new Error('Command executor not found')
    const groupMetadata = await this.validateCommand({ method: message.method, command, instance, store })
    if (!groupMetadata) return
    if (message.quoted) {
      message.quoted.delete()
    }
  }
  async deleteQuotedMessage(props: validateCommandProps, messageUpdate: ExtendedWAMessageUpdate) {
    try {
      if (!messageUpdate.quoted) {
        throw new Error('Quoted message not found')
      }

      const group = await Group.findOne({ groupId: messageUpdate.chat }).populate('messages').exec()
      if (!group) {
        throw new Error('Group not found')
      }

      const message = group.messages.find(m => m.id === messageUpdate.quoted.id)
      if (!message) {
        throw new Error('Message not found')
      }

      const currentMessage = await Message.findById(message._id).exec()
      if (!currentMessage) {
        throw new Error('Message not found')
      }

      await props.instance.sendMessage(messageUpdate.chat, {
        delete: {
          remoteJid: currentMessage.remoteJid,
          fromMe: currentMessage.fromMe,
          id: currentMessage.id,
          participant: currentMessage.participant,
        }
      })

      group.messages = group.messages.filter(m => m.id !== currentMessage.id)
      await currentMessage.delete()
      await group.save()
    } catch (error) {
      this.logger.error(error)
    }
  }
  constructor() {
    super('del')
  }
}
