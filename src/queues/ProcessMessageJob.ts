import { Job } from "bull";
import { WhatsAppInstance } from "../api/class/instance";
import { TBaileysInMemoryStore } from "../api/class/BaileysInMemoryStore";
import { ExtendedWAMessageUpdate, ExtendedWaSocket, transformMessageUpdate } from "../api/class/messageTransformer";
import Message from "../api/models/message.model";
import Group from "../api/models/group.model";
import commandDispatcher from "../api/class/commandDispatcher";
import P from "pino";
import spamCheck, { SpamCheckResult } from "../utils/spamCheck";
import { getWhatsAppId } from "../utils/getWhatsappId";
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
      // Salvar a mensagem no MongoDB
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

      const group = await Group.findOne({ groupId: parsedMessage.key.remoteJid }).exec();
      if (!group) {
        logger.info("Group not found");
        return;
      }
      group.messages.push(newMessage._id);
      await group.save();
      if (
        parsedMessage.command &&
        parsedMessage.command.command_name &&
        parsedMessage.command.command_executor
      ) {
        commandDispatcher(
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

export default processMessageJob;

module.exports = processMessageJob;
