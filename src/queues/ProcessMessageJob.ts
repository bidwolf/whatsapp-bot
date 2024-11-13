import { Job } from "bull";
import { TBaileysInMemoryStore } from "../api/class/BaileysInMemoryStore";
import Message from "../api/models/message.model";
import Group from "../api/models/group.model";
import initializeCommandDispatcher from "../utils/commandDispatcher";
import P from "pino";
import spamCheck, { SpamCheckResult } from "../utils/spamCheck";
import { getWhatsAppId } from "../utils/getWhatsappId";
import { checkImageContent, checkVideoContent } from "../utils/checkImageContent";
import downloadMsg from "../api/helper/downloadMsg";
import { MediaType } from "@whiskeysockets/baileys";
import { ExtendedWAMessageUpdate, transformMessageUpdate } from "../utils/messageTransformer";
const logger = P();
export interface ProcessMessageJobData {
  message: ExtendedWAMessageUpdate
  key: string
  store?: TBaileysInMemoryStore
}
async function processMessageJob(job: Job) {
  const { message, key, store } = job.data
  await processMessage({ message, key, store });
}
async function processMessage({ message, key, store }: ProcessMessageJobData): Promise<void> {
  logger.info("Processing message");
  try {
    if (!store) {
      throw new Error('Store not found')
    }
    const instance = global.WhatsAppInstances[key];
    const parsedMessage = transformMessageUpdate(
      instance.instance.sock,
      message,
      store,
    );
    if (parsedMessage.isGroup) {
      const groupAvailable = await Group.findOne({ groupId: parsedMessage.key.remoteJid }).exec();
      if (!groupAvailable) {
        logger.info("Group not available");
        return;
      }
      if (!groupAvailable.enabled) {
        logger.info('Group is disabled, you can only use the bot command')
        if (parsedMessage && parsedMessage.command && parsedMessage.command.command_name) {
          if (parsedMessage.command.command_name !== 'bot') return;
        }
      }
      if (parsedMessage && parsedMessage.command && parsedMessage.command.command_name) {
        if (groupAvailable.blockedCommands.includes(parsedMessage.command.command_name) && !['on', 'off'].includes(parsedMessage.command.command_name)) {
          logger.info(`Command ${parsedMessage.command.command_name} is blocked`)
          return
        }
      }
      const containsWhatsAppLink = parsedMessage?.text?.match(/https:\/\/chat\.whatsapp\.com\/[^\s]+/g) || false
      if (!groupAvailable.shareInviteEnabled && containsWhatsAppLink) {
        if (parsedMessage.key.fromMe) return;
        const linkGroup = await instance.instance.sock.groupInviteCode(parsedMessage.chat)
        if (linkGroup && !(linkGroup.includes(parsedMessage.text) || parsedMessage?.text?.includes(linkGroup))) {
          await instance.instance.sock.groupParticipantsUpdate(
            parsedMessage.key.remoteJid,
            [getWhatsAppId(parsedMessage.participant)],
            'remove'
          )
          await message?.delete?.()
        }
      }
      if (groupAvailable.spamDetection) {
        const spam = await spamCheck(message)
        if (spam === SpamCheckResult.SPAM_WARNING) {
          message?.reply?.('⚠️ Você está enviando mensagens muito rapidamente. Por favor, aguarde alguns segundos antes de enviar outra mensagem.')
        } else if (spam === SpamCheckResult.SPAM_BLOCK) {
          const result = await instance.instance.sock.groupParticipantsUpdate(
            message.key.remoteJid,
            [getWhatsAppId(message.participant)],
            'remove'
          )
          if (result && result.length > 0 && result[0].status == '200') {
            message?.reply?.("Usuário removido por enviar flood");
          }
          return;
        }
      }
      logger.info(
        `Group ${parsedMessage.key.remoteJid} available and offensive messages are ${groupAvailable.allowOffenses ? "allowed" : "blocked"}`,
      );
      if ((parsedMessage.isOffensive && !groupAvailable.allowOffenses) || groupAvailable.blackListedUsers.includes(parsedMessage.sender)) {
        logger.info("Offensive message blocked");
        try {
          if (parsedMessage.delete) {
            parsedMessage.delete();
          }
        } catch (e) {
          logger.error(e);
        }
        return;
      }
      const newMessage = new Message({
        remoteJid: parsedMessage.chat,
        fromMe: parsedMessage.fromMe,
        id: parsedMessage.id,
        participant: parsedMessage.participant,
        message: parsedMessage.text,
        timestamp: new Date()
      });
      await newMessage.save();
      // Relacionar a mensagem com o grupo

      // Salvar a mensagem no MongoDB

      const group = await Group.findOne({ groupId: parsedMessage.key.remoteJid }).exec();
      if (!group) {
        logger.info("Group not found");
        return;
      }
      group.messages.push(newMessage._id);
      await group.save();
      if (!group?.allowNSFW && parsedMessage.mtype && parsedMessage.msg?.url) {
        const checkableMediaTypes: MediaType[] = ["image", "gif", "video", "thumbnail-video", "thumbnail-image"]
        const shouldCheck = checkableMediaTypes.includes(getMediaType(parsedMessage.mtype))
        if (shouldCheck) {
          const buffer = await downloadMsg(parsedMessage, getMediaType(parsedMessage.mtype))
          if (!buffer) {
            logger.info("Media not found");
            return;
          }
          let isInappropriate = false
          if (getMediaType(parsedMessage?.mtype) === 'video') {
            isInappropriate = await checkVideoContent(buffer);
          } else {
            isInappropriate = await checkImageContent(buffer);
          }
          if (isInappropriate) {
            logger.info("Inappropriate content detected and deleted");
            if (parsedMessage.delete) {
              parsedMessage.delete();
            }
            return;
          }
        }
      }

      if (
        parsedMessage.command &&
        parsedMessage.command.command_name &&
        parsedMessage.command.command_executor
      ) {
        initializeCommandDispatcher(
          instance.instance.sock,
          parsedMessage,
          groupAvailable,
          store,
        );
      }
    }
  } catch (e) {
    console.error(e)
  }
}
const getMediaType = (mtype: string): MediaType => {
  switch (mtype) {
    case 'imageMessage':
      return "image"
    case 'stickerMessage':
      return 'sticker'
    case 'videoMessage':
      return 'video'
    case 'audioMessage':
      return 'audio'
    default:
      return 'document'
  }
}
export default processMessageJob;

module.exports = processMessageJob;
