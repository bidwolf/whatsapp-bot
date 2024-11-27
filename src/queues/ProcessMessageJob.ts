import { Job } from "bull";
import { TBaileysInMemoryStore } from "../api/class/BaileysInMemoryStore";
import Message from "../models/message.model";
import Group from "../models/group.model";
import initializeWhatsappCommandDispatcher from "../utils/commandDispatcher";
import { Logger } from "pino";
import spamCheck, { SpamCheckResult } from "../utils/spamCheck";
import { getWhatsAppId } from "../utils/getWhatsappId";

import downloadMsg from "../api/helper/downloadMsg";
import { MediaType } from "@whiskeysockets/baileys";
import { ExtendedWAMessageUpdate, transformMessageUpdate } from "../utils/messageTransformer";
import { getMediaType } from "../utils/getMediaType";
import os from 'os';
export interface ProcessMessageJobData {
  message: ExtendedWAMessageUpdate
  key: string
  store?: TBaileysInMemoryStore;
  logger: Logger
}
async function processMessageJob(job: Job<ProcessMessageJobData>) {
  await processMessage(job.data);
}
async function processMessage({ message, key, store, logger }: ProcessMessageJobData): Promise<void> {
  logger.info("Processing message");
  try {
    if (!store) {
      throw new Error('Store not found')
    }
    const instance = global.WhatsAppInstances[key];
    const parsedMessage = await transformMessageUpdate(
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
      const containsWhatsAppLink = containsWhatsAppChatLink(parsedMessage)
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
      const group = await Group.findOne({ groupId: parsedMessage.key.remoteJid }).exec();
      if (!group) {
        logger.info("Group not found");
        return;
      }
      group.messages.push(newMessage._id);
      await group.save();
      const isMac = os.platform() === 'darwin';
      if (isMac) {
        logger.info("Running on macOS, skipping NSFW check");
      }
      if (!isMac && !group?.allowNSFW && parsedMessage.mtype && parsedMessage.msg?.url) {
        const { checkImageContent, checkVideoContent } = await import("../utils/checkImageContent");
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
        initializeWhatsappCommandDispatcher(
          instance.instance.sock,
          parsedMessage,
          logger,
        );
      }
    }
  } catch (e) {
    console.error(e)
  }
}

module.exports = { processMessage, processMessageJob };

function containsWhatsAppChatLink(parsedMessage: ExtendedWAMessageUpdate) {
  return parsedMessage?.text?.match(/https:\/\/chat\.whatsapp\.com\/[^\s]+/g) || false;
}
