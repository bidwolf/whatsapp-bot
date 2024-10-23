/* eslint-disable no-unsafe-optional-chaining */
const QRCode = require("qrcode");
const pino = require("pino");
const {
  default: makeWASocket,
  makeInMemoryStore,
  isJidBroadcast,
  DisconnectReason,
  isJidNewsletter,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const { unlinkSync } = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const processButton = require("../helper/processbtn");
const generateVC = require("../helper/genVc");
const Chat = require("../models/chat.model");
const Group = require("../models/group.model");
const axios = require("axios");
const config = require("../../config/config");
const fs = require("fs");
const downloadMessage = require("../helper/downloadMsg");
const logger = require("pino")();
const useMongoDBAuthState = require("../helper/mongoAuthState");
const {
  get_command,
  get_command_extended,
  get_command_mention,
} = require("../../utils/commands");
const { sanitizeNumber } = require("../../utils/conversionHelpers");
const { handleRemoval } = require("../../utils/listeners");
const useStore = !process.argv.includes("--no-store");
const NodeCache = require("node-cache");
/**
 * @typedef {"all"|"mention"|"reply"|"raw"} Method
 */
/**
 * @typedef {Object} CommandInfo
 * @property {string[]} args
 * @property {string} groupId
 * @property {string}command_executor
 */
/**
 *
 * @typedef {Object} CommandCaller
 * @property {string[]} args
 * @property {string} groupId
 * @property {string}command_executor
 * @property {command_name} command_name
 */

const store = useStore ? makeInMemoryStore({ logger }) : undefined;

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache();
store?.readFromFile("./baileys_store_multi.json");
setInterval(() => {
  store?.writeToFile("./baileys_store_multi.json");
}, 100000);
class WhatsAppInstance {
  socketConfig = {
    // comment the line below out
    shouldIgnoreJid: (jid) =>
      !jid || isJidBroadcast(jid) || isJidNewsletter(jid),
    // implement to handle retries
    defaultQueryTimeoutMs: undefined,
    printQRInTerminal: false,
    msgRetryCounterCache,
    logger: pino({
      level: config.log.level,
    }),
    mobile: false,
    shouldSyncHistoryMessage: (msg) => {
      return !!msg.syncType;
    },
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }

      // only if store is present
      return {
        conversation: "hello",
      };
    },
    patchMessageBeforeSending: async (msg, recipientJids) => {
      await this.instance?.sock.uploadPreKeysToServerIfRequired();
      return msg;
    },
  };
  key = "";
  authState;
  allowWebhook = undefined;
  webhook = undefined;

  instance = {
    key: this.key,
    chats: [],
    qr: "",
    messages: [],
    qrRetry: 0,
    customWebhook: "",
    availableGroups: [],
  };

  axiosInstance = axios.create({
    baseURL: config.webhookUrl,
  });

  constructor(key, allowWebhook, webhook) {
    this.key = key ? key : uuidv4();
    this.loadAvailableGroups();
    this.instance.customWebhook = this.webhook ? this.webhook : webhook;
    this.allowWebhook = config.webhookEnabled
      ? config.webhookEnabled
      : allowWebhook;
    if (this.allowWebhook && this.instance.customWebhook !== null) {
      this.allowWebhook = true;
      this.instance.customWebhook = webhook;
      this.axiosInstance = axios.create({
        baseURL: webhook,
      });
    }
  }

  async SendWebhook(type, body, key) {
    if (!this.allowWebhook) return;
    this.axiosInstance
      .post("", {
        type,
        body,
        instanceKey: key,
      })
      .catch(() => {});
  }

  async init() {
    this.collection = mongoClient.db("whatsapp-api").collection(this.key);
    const { state, saveCreds } = await useMongoDBAuthState(this.collection);
    this.authState = { state: state, saveCreds: saveCreds };
    this.socketConfig.auth = this.authState.state;
    this.socketConfig.browser = Object.values(config.browser);
    this.instance.sock = makeWASocket(this.socketConfig);
    store?.bind(this.instance.sock.ev);
    this.setHandler();
    return this;
  }
  /**
   *
   * @param {{infoCommandMessage:string,groupId:string,command_executor:string,allowedMethods:Method[],methods:Method,message:*}} param0
   * @returns
   */
  async validateCommand({
    infoCommandMessage,
    groupId,
    command_executor,
    allowedMethods,
    methods: method,
    message,
  }) {
    const groupInformation = await this.fetchGroupMetadata(groupId);
    if (!groupInformation) {
      logger.info("Group not found");
      return;
    }
    const isAdmin = groupInformation.participants.find(
      (p) => p.id === command_executor && p.admin,
    );
    if (!isAdmin) {
      logger.info("Executor is not admin");
      return;
    }
    if (!allowedMethods.includes(method)) {
      logger.info("O comando não pode ser executado dessa forma");
      await this.replyMessage(groupId, infoCommandMessage, message);
      return;
    }
    return groupInformation;
  }

  /**
   * @param {CommandCaller} commandInfo
   * @param {Method} method
   * @param {*} message
   */
  async removeUserFromGroup(
    { args, groupId, command_executor },
    method,
    message,
  ) {
    const infoCommandMessage =
      "Para executar esse comando você deve mencionar alguém ou responder a mensagem do alvo a ser banido.";
    const groupInformation = await this.validateCommand({
      infoCommandMessage,
      groupId,
      command_executor,
      allowedMethods: ["mention", "reply"],
      methods: method,
      message,
    });
    const userNumber = typeof args === "string" ? args : args.join(" ");
    if (userNumber && groupInformation) {
      const sanitizedNumber = sanitizeNumber(userNumber);
      const participant = groupInformation.participants.find(
        (p) => p.id === `${sanitizedNumber}@s.whatsapp.net`,
      );
      if (!participant) {
        logger.info("Participant not found");
        await this.replyMessage(
          groupId,
          "Este número não se encontra no grupo.",
          message,
        );
        return;
      }
      if (participant.admin) {
        logger.info("Participant not removed because it is admin");
        await this.replyMessage(
          groupId,
          "Não tenho permissão para banir administradores.",
          message,
        );
        return;
      }
      const result = await this.groupParticipantsUpdate(
        groupId,
        [participant.id],
        "remove",
      );
      if (result && result.length > 0 && result[0].status == 200) {
        logger.info("Participant removed");
        await this.replyMessage(groupId, "Número banido com sucesso.", message);
      } else {
        logger.info("Participant not removed");
      }
      await this.SendWebhook("ban", { participant: participant.id }, this.key);
    }
  }
  /**
   *
   * @param {CommandCaller} commandCaller
   * @param {Method} method
   * @param {*} message
   * @returns
   */

  async addUserIntoGroup({ args, groupId, command_executor }, method, message) {
    const infoCommandMessage =
      "Para executar esse comando você deve enviar o número do alvo a ser adicionado.";
    const groupInformation = await this.validateCommand({
      infoCommandMessage,
      groupId,
      command_executor,
      allowedMethods: ["raw"],
      methods: method,
      message,
    });
    const userNumber = typeof args === "string" ? args : args.join(" ");
    if (userNumber && groupInformation) {
      const sanitizedNumber = sanitizeNumber(userNumber);
      const newParticipantId = `${sanitizedNumber}@s.whatsapp.net`;
      const result = await this.groupParticipantsUpdate(
        groupId,
        [newParticipantId],
        "add",
      );
      if (result && result.length > 0) {
        if (result[0].status == 200) {
          logger.info("Participant added");
          await this.replyMessage(
            groupId,
            "Número adicionado com sucesso.",
            message,
          );
          await this.SendWebhook(
            "add",
            { participant: newParticipantId },
            this.key,
          );
        } else if (result[0].status == 403) {
          logger.info("Participant not added");
          await this.replyMessage(
            groupId,
            "Não foi possível adicionar esse número diretamente ao grupo. Um convite foi enviado mas ainda pode ser recusado.",
            message,
          );
          const groupInvite = await this.getInviteCodeGroup(groupId);
          if (groupInvite) {
            await this.sendTextMessage(
              newParticipantId,
              `Você foi convidado para o grupo ${groupInformation.subject}.\nhttps://chat.whatsapp.com/${groupInvite}`,
            );
          }
        }
      }
    } else {
      await this.replyMessage(
        groupId,
        "Número inválido.\nEste número não existe ou não se encontra cadastrado no whatsApp.",
        message,
      );
      logger.info("Participant not added");
    }
  }
  /**
   *
   * @param {{command_name:string,args:string[],groupId:string,command_executor:string}} param0
   * @param {"all"|"mention"|"reply"|"raw"} method
   * @param {*} message
   */
  async chooseCommand(
    { command_name, args, groupId, command_executor },
    method,
    message,
  ) {
    const isGroupAvailable = this.isGroupAvailable(groupId);
    if (!isGroupAvailable) {
      logger.info("Group not available");
      return;
    }
    switch (command_name) {
      case "ban": {
        await this.removeUserFromGroup(
          { args, command_executor, groupId },
          method,
          message,
        );
        break;
      }
      case "add": {
        await this.addUserIntoGroup(
          { args, command_executor, groupId },
          method,
          message,
        );
        break;
      }
      default:
        console.log("No command found");
        break;
    }
  }
  async loadAvailableGroups() {
    try {
      const groups = await Group.find({ key: this.key }).exec();
      this.instance.availableGroups = groups.map((group) => ({
        groupId: group.groupId,
        blockedCommands: group.blockedCommands || [],
      }));
      logger.info(
        `Available groups loaded ${this.instance.availableGroups.length}`,
      );
      return this.instance.availableGroups;
    } catch (error) {
      logger.error(`Error loading available groups ${error}`);
    }
  }
  async getAllAvailableGroupMetadata() {
    try {
      let data = [];
      const fetchData = await Promise.all(
        this.instance.availableGroups.map(async (group) => {
          const metadata = await this.fetchGroupMetadata(group.groupId);
          data.push({
            ...group,
            participants: metadata.participants,
            name: metadata.subject,
          });
        }),
      )
        .then(() => {
          logger.info("Groups metadata loaded successfully.");
          return data;
        })
        .catch((error) => {
          logger.error(`Error loading group metadata loop ${error}`);
        });
      return fetchData;
    } catch (error) {
      logger.error(`Error getting group metadata ${error}`);
    }
  }
  /**
   * @description Register a group to the instance and save it to the database
   * @param {string} groupId
   */
  async registerGroup(groupId) {
    try {
      const existentGroup = await Group.findOne({
        key: this.key,
        groupId: groupId,
      }).exec();
      if (existentGroup) {
        logger.info("Group already registered");
        return;
      }
      const group = new Group({ key: this.key, groupId: groupId });
      await group.save();
      this.instance.availableGroups.push(group);
      logger.info("Group registered");
    } catch (error) {
      logger.error(`Error registering group ${error}`);
    }
  }
  /**
   * @description Unregister a group from the instance and delete it from the database
   * @param {string} groupId
   * @returns
   */
  async unregisterGroup(groupId) {
    try {
      const existentGroup = await Group.findOne({
        key: this.key,
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        logger.info("Group not found");
        return;
      }
      await existentGroup.delete();
      this.instance.availableGroups = this.instance.availableGroups.filter(
        (g) => g.groupId !== groupId,
      );
      logger.info("Group unregistered");
    } catch (error) {
      logger.error(`Error unregistering group ${error}`);
    }
  }
  getAllAvailableGroups() {
    return this.instance.availableGroups;
  }
  isGroupAvailable(groupId) {
    return this.instance.availableGroups.find((g) => g.groupId === groupId);
  }
  /**
   * @description Add a command to the group block list
   * @param {string} commandName
   * @param {string} groupId
   * @returns
   */
  async addCommandToGroupBlockedList(commandName, groupId) {
    try {
      const isGroupAvailable = this.isGroupAvailable(groupId);
      if (!isGroupAvailable) {
        logger.info("Group not available");
        return;
      }
      const group = await Group.findOne({
        key: this.key,
        groupId: groupId,
      }).exec();
      if (!group) {
        logger.info("Group not found");
        return;
      }
      if (!group.blockedCommands) {
        group.blockedCommands = [];
      }
      group.blockedCommands.push(commandName);
      await group.save();
      const groupIndex = this.instance.availableGroups.findIndex(
        (g) => g.groupId === groupId,
      );
      this.instance.availableGroups[groupIndex] = group;
      logger.info("Command added to blocked list");
    } catch (error) {
      logger.error(`Error adding command to blocked list ${error}`);
    }
  }
  /**
   * @description Remove a command from the group block list
   * @param {string} commandName
   * @param {string} groupId
   * @returns
   */
  async removeCommandFromGroupBlockedList(commandName, groupId) {
    try {
      const isGroupAvailable = this.isGroupAvailable(groupId);
      if (!isGroupAvailable) {
        logger.info("Group not available");
        return;
      }
      const group = await Group.findOne({
        key: this.key,
        groupId: groupId,
      }).exec();
      if (!group) {
        logger.info("Group not found");
        return;
      }
      if (!group.blockedCommands) {
        group.blockedCommands = [];
        logger.info("No commands blocked");
        return;
      }
      group.blockedCommands = group.blockedCommands.filter(
        (c) => c !== commandName,
      );
      await group.save();
      const groupIndex = this.instance.availableGroups.findIndex(
        (g) => g.groupId === groupId,
      );
      this.instance.availableGroups[groupIndex] = group;
      logger.info("Command removed from blocked list");
    } catch (error) {
      logger.error(`Error removing command from blocked list ${error}`);
    }
  }
  /**
   * @description Add a number to the group block list
   * @param {string} number
   * @param {string} groupId
   * @returns
   */
  async addNumberToGroupBlockList(number, groupId) {
    try {
      const isGroupAvailable = this.isGroupAvailable(groupId);
      if (!isGroupAvailable) {
        logger.info("Group not available");
        return;
      }
      const group = await Group.findOne({
        key: this.key,
        groupId: groupId,
      }).exec();
      if (!group) {
        logger.info("Group not found");
        return;
      }
      if (!group.blackListedUsers) {
        group.blackListedUsers = [];
      }
      group.blackListedUsers.push(number);
      await group.save();
      const groupIndex = this.instance.availableGroups.findIndex(
        (g) => g.groupId === groupId,
      );
      this.instance.availableGroups[groupIndex] = group;
      logger.info("Number added to blocked list");
    } catch (error) {
      logger.error(`Error adding number to blocked list ${error}`);
    }
  }

  setHandler() {
    const sock = this.instance.sock;
    // on credentials update save state
    sock?.ev.on("creds.update", this.authState.saveCreds);

    // on socket closed, opened, connecting
    sock?.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === "connecting") return;

      if (connection === "close") {
        // reconnect if not logged out
        if (
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          await this.init();
        } else {
          await this.collection.drop().then((r) => {
            logger.info("STATE: Droped collection");
          });
          this.instance.online = false;
        }

        if (
          ["all", "connection", "connection.update", "connection:close"].some(
            (e) => config.webhookAllowedEvents.includes(e),
          )
        )
          await this.SendWebhook(
            "connection",
            {
              connection: connection,
            },
            this.key,
          );
      } else if (connection === "open") {
        if (config.mongoose.enabled) {
          let alreadyThere = await Chat.findOne({
            key: this.key,
          }).exec();
          if (!alreadyThere) {
            const saveChat = new Chat({ key: this.key });
            await saveChat.save();
          }
        }
        this.instance.online = true;
        if (
          ["all", "connection", "connection.update", "connection:open"].some(
            (e) => config.webhookAllowedEvents.includes(e),
          )
        )
          await this.SendWebhook(
            "connection",
            {
              connection: connection,
            },
            this.key,
          );
      }

      if (qr) {
        QRCode.toDataURL(qr).then((url) => {
          this.instance.qr = url;
          this.instance.qrRetry++;
          if (this.instance.qrRetry >= config.instance.maxRetryQr) {
            // close WebSocket connection
            this.instance.sock.ws.close();
            // remove all events
            this.instance.sock.ev.removeAllListeners();
            this.instance.qr = " ";
            logger.info("socket connection terminated");
          }
        });
      }
    });

    // sending presence
    sock?.ev.on("presence.update", async (json) => {
      if (
        ["all", "presence", "presence.update"].some((e) =>
          config.webhookAllowedEvents.includes(e),
        )
      )
        await this.SendWebhook("presence", json, this.key);
    });

    // on receive all chats
    sock?.ev.on("chats.set", async ({ chats }) => {
      this.instance.chats = [];
      const initializedChats = chats.map((chat) => {
        return {
          ...chat,
          messages: [],
        };
      });
      this.instance.chats.push(...initializedChats);
      await this.updateDb(this.instance.chats);
      await this.updateDbGroupsParticipants();
    });

    // on receive new chat
    sock?.ev.on("chats.upsert", (newChat) => {
      //console.log('chats.upsert')
      //console.log(newChat)

      const chats = newChat.map((chat) => {
        return {
          ...chat,
          messages: [],
        };
      });
      this.instance.chats.push(...chats);
    });

    // on chat change
    sock?.ev.on("chats.update", (changedChat) => {
      //console.log('chats.update')
      //console.log(changedChat)
      changedChat.map((chat) => {
        const index = this.instance.chats.findIndex((pc) => pc.id === chat.id);
        const PrevChat = this.instance.chats[index];
        this.instance.chats[index] = {
          ...PrevChat,
          ...chat,
        };
      });
    });

    // on chat delete
    sock?.ev.on("chats.delete", (deletedChats) => {
      //console.log('chats.delete')
      //console.log(deletedChats)
      deletedChats.map((chat) => {
        const index = this.instance.chats.findIndex((c) => c.id === chat);
        this.instance.chats.splice(index, 1);
      });
    });

    // on new mssage
    sock?.ev.on("messages.upsert", async (receivedMessages) => {
      //console.log('messages.upsert')
      //console.log(m)
      const m = receivedMessages.messages[0];
      try {
        logger.debug(`📩 Upserted message:`, m);
      } catch (error) {
        logger.error(`❌ Error handling messages.upsert event:`, error);
      }
      if (receivedMessages.type === "prepend")
        this.instance.messages.unshift(...receivedMessages.messages);
      if (receivedMessages.type !== "notify") return;

      // https://adiwajshing.github.io/Baileys/#reading-messages
      if (config.markMessagesRead) {
        const unreadMessages = receivedMessages.messages.map((msg) => {
          return {
            remoteJid: msg.key.remoteJid,
            id: msg.key.id,
            participant: msg.key?.participant,
          };
        });
        await sock.readMessages(unreadMessages);
      }

      this.instance.messages.unshift(...receivedMessages.messages);

      for (const msg of receivedMessages.messages) {
        if (!msg.message) continue;

        const messageType = Object.keys(msg.message)[0];

        if (["protocolMessage"].includes(messageType)) {
          continue;
        }

        if ("extendedTextMessage" in msg.message) {
          const webhookData = {
            key: this.key,
            ...msg,
          };
          if (String(msg.message.extendedTextMessage?.text)?.includes("@")) {
            webhookData.message.extendedTextMessage.text = String(
              webhookData.message.extendedTextMessage.text,
            ).split(" ")[0];
            const commandMention = get_command_mention(webhookData);
            if (commandMention && commandMention.command_name) {
              await this.chooseCommand(commandMention, "mention", msg);
              continue;
            }
          }
          const command = get_command_extended(webhookData);
          if (command && command.command_name) {
            await this.chooseCommand(command, "reply", msg);
            continue;
          }
        }

        const webhookData = {
          key: this.key,
          ...msg,
        };

        if (messageType === "conversation") {
          webhookData["text"] = msg.message.conversation;
          const command = get_command(webhookData);
          if (command && command.command_name) {
            await this.chooseCommand(command, "raw", msg);
            continue;
          }
        }

        if (messageType === "extendedTextMessage") {
          const command = get_command_mention(webhookData);
          if (command && command.command_name) {
            await this.chooseCommand(command, "mention", msg);
            continue;
          }
        }

        if (config.webhookBase64) {
          switch (messageType) {
            case "imageMessage":
              webhookData["msgContent"] = await downloadMessage(
                msg.message.imageMessage,
                "image",
              );
              break;
            case "videoMessage":
              webhookData["msgContent"] = await downloadMessage(
                msg.message.videoMessage,
                "video",
              );
              break;
            case "audioMessage":
              webhookData["msgContent"] = await downloadMessage(
                msg.message.audioMessage,
                "audio",
              );
              break;
            default:
              webhookData["msgContent"] = "";
              break;
          }
        }

        if (
          ["all", "messages", "messages.upsert"].some((e) =>
            config.webhookAllowedEvents.includes(e),
          )
        ) {
          await this.SendWebhook("message", webhookData, this.key);
        }
      }
    });

    sock?.ev.on("messages.update", async (messages) => {
      // console.log('messages.update')
      //console.dir(messages);
    });
    sock?.ws.on("CB:call", async (data) => {
      if (data.content) {
        if (data.content.find((e) => e.tag === "offer")) {
          const content = data.content.find((e) => e.tag === "offer");
          if (
            ["all", "call", "CB:call", "call:offer"].some((e) =>
              config.webhookAllowedEvents.includes(e),
            )
          )
            await this.SendWebhook(
              "call_offer",
              {
                id: content.attrs["call-id"],
                timestamp: parseInt(data.attrs.t),
                user: {
                  id: data.attrs.from,
                  platform: data.attrs.platform,
                  platform_version: data.attrs.version,
                },
              },
              this.key,
            );
        } else if (data.content.find((e) => e.tag === "terminate")) {
          const content = data.content.find((e) => e.tag === "terminate");

          if (
            ["all", "call", "call:terminate"].some((e) =>
              config.webhookAllowedEvents.includes(e),
            )
          )
            await this.SendWebhook(
              "call_terminate",
              {
                id: content.attrs["call-id"],
                user: {
                  id: data.attrs.from,
                },
                timestamp: parseInt(data.attrs.t),
                reason: data.content[0].attrs.reason,
              },
              this.key,
            );
        }
      }
    });
    sock.ws.on("CB:notification,addressing_mode:pn", async (node) => {
      const { from: groupId, content } = node.attrs;
      const user = this.instance?.online ? this.instance.sock?.user : {};
      const events = Array.from(node.content);

      events.forEach((event) => {
        const { tag, content: eventContent } = event;

        if (tag === "add") {
          logger.info(`A user has been added to group ${groupId}`);
        } else if (tag === "remove") {
          logger.info(`A user has been removed from the group ${groupId}`);
          handleRemoval(eventContent, groupId, user, this.unregisterGroup);
        }
      });
    });
    sock?.ev.on("groups.upsert", async (newChat) => {
      //console.log('groups.upsert')
      //console.log(newChat)
      this.createGroupByApp(newChat);
      if (
        ["all", "groups", "groups.upsert"].some((e) =>
          config.webhookAllowedEvents.includes(e),
        )
      )
        await this.SendWebhook(
          "group_created",
          {
            data: newChat,
          },
          this.key,
        );
    });
    sock?.ev.on("groups.update", async (newChat) => {
      //console.log('groups.update')
      //console.log(newChat)
      this.updateGroupSubjectByApp(newChat);
      if (
        ["all", "groups", "groups.update"].some((e) =>
          config.webhookAllowedEvents.includes(e),
        )
      )
        await this.SendWebhook(
          "group_updated",
          {
            data: newChat,
          },
          this.key,
        );
    });

    sock?.ev.on("group-participants.update", async (newChat) => {
      //console.log('group-participants.update')
      //console.log(newChat)
      this.updateGroupParticipantsByApp(newChat);
      if (
        [
          "all",
          "groups",
          "group_participants",
          "group-participants.update",
        ].some((e) => config.webhookAllowedEvents.includes(e))
      )
        await this.SendWebhook(
          "group_participants_updated",
          {
            data: newChat,
          },
          this.key,
        );
    });
  }

  async deleteInstance(key) {
    try {
      await Chat.findOneAndDelete({ key: key });
    } catch (e) {
      logger.error("Error updating document failed");
    }
  }

  async getInstanceDetail(key) {
    return {
      instance_key: key,
      phone_connected: this.instance?.online,
      webhookUrl: this.instance.customWebhook,
      user: this.instance?.online ? this.instance.sock?.user : {},
    };
  }

  getWhatsAppId(id) {
    if (id.includes("@g.us") || id.includes("@s.whatsapp.net")) return id;
    return id.includes("-") ? `${id}@g.us` : `${id}@s.whatsapp.net`;
  }

  async verifyId(id) {
    if (id.includes("@g.us")) return true;
    const [result] = await this.instance.sock?.onWhatsApp(id);
    if (result?.exists) return true;
    throw new Error("no account exists");
  }

  async sendTextMessage(to, message) {
    await this.verifyId(this.getWhatsAppId(to));
    const data = await this.instance.sock?.sendMessage(this.getWhatsAppId(to), {
      text: message,
    });
    return data;
  }
  async mentionMessage(to, text, sender) {
    await this.verifyId(this.getWhatsAppId(to));
    const data = await this.instance.sock?.sendMessage(this.getWhatsAppId(to), {
      text: `@${sender.split("@")[0]} ${text}`,
      mentions: [sender],
    });
    return data;
  }

  async replyMessage(to, text, message) {
    await this.clearStore();
    await this.verifyId(this.getWhatsAppId(to));
    const data = await this.instance.sock?.sendMessage(
      this.getWhatsAppId(to),
      { text },

      {
        quoted: message,
      },
    );
    return data;
  }
  async clearStore() {
    // essa função limpa o cache de mensagens antes de tentar enviar uma nova mensagem
    // isso evita que a mensagem não seja enviada no baileys

    // usa o fs para limpar o arquivo mas não remove o arquivo
    fs.writeFileSync(
      path.join(__dirname, "../../baileys_store_multi.json"),
      "{}",
    );
  }
  async sendMediaFile(to, file, type, caption = "", filename) {
    await this.verifyId(this.getWhatsAppId(to));
    const data = await this.instance.sock?.sendMessage(this.getWhatsAppId(to), {
      mimetype: file.mimetype,
      [type]: file.buffer,
      caption: caption,
      ptt: type === "audio" ? true : false,
      fileName: filename ? filename : file.originalname,
    });
    return data;
  }

  async sendUrlMediaFile(to, url, type, mimeType, caption = "") {
    await this.verifyId(this.getWhatsAppId(to));

    const data = await this.instance.sock?.sendMessage(this.getWhatsAppId(to), {
      [type]: {
        url: url,
      },
      caption: caption,
      mimetype: mimeType,
    });
    return data;
  }

  async DownloadProfile(of) {
    await this.verifyId(this.getWhatsAppId(of));
    const ppUrl = await this.instance.sock?.profilePictureUrl(
      this.getWhatsAppId(of),
      "image",
    );
    return ppUrl;
  }

  async getUserStatus(of) {
    await this.verifyId(this.getWhatsAppId(of));
    const status = await this.instance.sock?.fetchStatus(
      this.getWhatsAppId(of),
    );
    return status;
  }

  async blockUnblock(to, data) {
    await this.verifyId(this.getWhatsAppId(to));
    const status = await this.instance.sock?.updateBlockStatus(
      this.getWhatsAppId(to),
      data,
    );
    return status;
  }

  async sendButtonMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));
    const result = await this.instance.sock?.sendMessage(
      this.getWhatsAppId(to),
      {
        templateButtons: processButton(data.buttons),
        text: data.text ?? "",
        footer: data.footerText ?? "",
        viewOnce: true,
      },
    );
    return result;
  }

  async sendContactMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));
    const vcard = generateVC(data);
    const result = await this.instance.sock?.sendMessage(
      await this.getWhatsAppId(to),
      {
        contacts: {
          displayName: data.fullName,
          contacts: [{ displayName: data.fullName, vcard }],
        },
      },
    );
    return result;
  }

  async sendListMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));
    const result = await this.instance.sock?.sendMessage(
      this.getWhatsAppId(to),
      {
        text: data.text,
        sections: data.sections,
        buttonText: data.buttonText,
        footer: data.description,
        title: data.title,
        viewOnce: true,
      },
    );
    return result;
  }

  async sendMediaButtonMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));

    const result = await this.instance.sock?.sendMessage(
      this.getWhatsAppId(to),
      {
        [data.mediaType]: {
          url: data.image,
        },
        footer: data.footerText ?? "",
        caption: data.text,
        templateButtons: processButton(data.buttons),
        mimetype: data.mimeType,
        viewOnce: true,
      },
    );
    return result;
  }

  async setStatus(status, to) {
    await this.verifyId(this.getWhatsAppId(to));

    const result = await this.instance.sock?.sendPresenceUpdate(status, to);
    return result;
  }

  // change your display picture or a group's
  async updateProfilePicture(id, url) {
    try {
      const img = await axios.get(url, { responseType: "arraybuffer" });
      const res = await this.instance.sock?.updateProfilePicture(id, img.data);
      return res;
    } catch (e) {
      //console.log(e)
      return {
        error: true,
        message: "Unable to update profile picture",
      };
    }
  }

  // get user or group object from db by id
  async getUserOrGroupById(id) {
    try {
      let Chats = await this.getChat();
      const group = Chats.find((c) => c.id === this.getWhatsAppId(id));
      if (!group)
        throw new Error("unable to get group, check if the group exists");
      return group;
    } catch (e) {
      logger.error(e);
      logger.error("Error get group failed");
    }
  }

  // Group Methods
  parseParticipants(users) {
    return users.map((users) => this.getWhatsAppId(users));
  }

  async updateDbGroupsParticipants() {
    try {
      let groups = await this.groupFetchAllParticipating();
      let Chats = await this.getChat();
      if (groups && Chats) {
        for (const [key, value] of Object.entries(groups)) {
          let group = Chats.find((c) => c.id === value.id);
          if (group) {
            let participants = [];
            for (const [key_participant, participant] of Object.entries(
              value.participants,
            )) {
              participants.push(participant);
            }
            group.participant = participants;
            if (value.creation) {
              group.creation = value.creation;
            }
            if (value.subjectOwner) {
              group.subjectOwner = value.subjectOwner;
            }
            Chats.filter((c) => c.id === value.id)[0] = group;
          }
        }
        await this.updateDb(Chats);
      }
    } catch (e) {
      logger.error(e);
      logger.error("Error updating groups failed");
    }
  }

  async createNewGroup(name, users) {
    try {
      const group = await this.instance.sock?.groupCreate(
        name,
        users.map(this.getWhatsAppId),
      );
      return group;
    } catch (e) {
      logger.error(e);
      logger.error("Error create new group failed");
    }
  }

  async addNewParticipant(id, users) {
    try {
      const res = await this.instance.sock?.groupAdd(
        this.getWhatsAppId(id),
        this.parseParticipants(users),
      );
      return res;
    } catch {
      return {
        error: true,
        message:
          "Unable to add participant, you must be an admin in this group",
      };
    }
  }

  async makeAdmin(id, users) {
    try {
      const res = await this.instance.sock?.groupMakeAdmin(
        this.getWhatsAppId(id),
        this.parseParticipants(users),
      );
      return res;
    } catch {
      return {
        error: true,
        message:
          "unable to promote some participants, check if you are admin in group or participants exists",
      };
    }
  }

  async demoteAdmin(id, users) {
    try {
      const res = await this.instance.sock?.groupDemoteAdmin(
        this.getWhatsAppId(id),
        this.parseParticipants(users),
      );
      return res;
    } catch {
      return {
        error: true,
        message:
          "unable to demote some participants, check if you are admin in group or participants exists",
      };
    }
  }

  async getAllGroups() {
    let Chats = await this.getChat();
    return Chats.filter((c) => c.id.includes("@g.us")).map((data, i) => {
      return {
        index: i,
        name: data.name,
        jid: data.id,
        participant: data.participant,
        creation: data.creation,
        subjectOwner: data.subjectOwner,
      };
    });
  }

  async leaveGroup(id) {
    try {
      let Chats = await this.getChat();
      const group = Chats.find((c) => c.id === id);
      if (!group) throw new Error("no group exists");
      return await this.instance.sock?.groupLeave(id);
    } catch (e) {
      logger.error(e);
      logger.error("Error leave group failed");
    }
  }

  async getInviteCodeGroup(id) {
    try {
      let Chats = await this.getChat();
      const group = Chats.find((c) => c.id === id);
      if (!group)
        throw new Error("unable to get invite code, check if the group exists");
      return await this.instance.sock?.groupInviteCode(id);
    } catch (e) {
      logger.error(e);
      logger.error("Error get invite group failed");
    }
  }

  async getInstanceInviteCodeGroup(id) {
    try {
      return await this.instance.sock?.groupInviteCode(id);
    } catch (e) {
      logger.error(e);
      logger.error("Error get invite group failed");
    }
  }

  // get Chat object from db
  async getChat(key = this.key) {
    let dbResult = await Chat.findOne({ key: key }).exec();
    let ChatObj = dbResult.chat;
    return ChatObj;
  }

  // create new group by application
  async createGroupByApp(newChat) {
    try {
      let Chats = await this.getChat();
      let group = {
        id: newChat[0].id,
        name: newChat[0].subject,
        participant: newChat[0].participants,
        messages: [],
        creation: newChat[0].creation,
        subjectOwner: newChat[0].subjectOwner,
      };
      Chats.push(group);
      await this.updateDb(Chats);
    } catch (e) {
      logger.error(e);
      logger.error("Error updating document failed");
    }
  }

  async updateGroupSubjectByApp(newChat) {
    //console.log(newChat)
    try {
      if (newChat[0] && newChat[0].subject) {
        let Chats = await this.getChat();
        const chat = Chats.find((c) => c.id === newChat[0].id);
        if (!chat) {
          logger.info("Group not found");
          return;
        }
        chat.name = newChat[0].subject;
        await this.updateDb(Chats);
      }
    } catch (e) {
      logger.error(e);
      logger.error("Error updating document failed");
    }
  }

  async updateGroupParticipantsByApp(newChat) {
    //console.log(newChat)
    try {
      if (newChat && newChat.id) {
        let Chats = await this.getChat();
        let chat = Chats.find((c) => c.id === newChat.id);
        let is_owner = false;
        if (chat) {
          if (chat.participant == undefined) {
            chat.participant = [];
          }
          if (chat.participant && newChat.action == "add") {
            for (const participant of newChat.participants) {
              chat.participant.push({
                id: participant,
                admin: null,
              });
            }
          }
          if (chat.participant && newChat.action == "remove") {
            for (const participant of newChat.participants) {
              // remove group if they are owner
              if (chat.subjectOwner == participant) {
                is_owner = true;
              }
              chat.participant = chat.participant.filter(
                (p) => p.id != participant,
              );
            }
          }
          if (chat.participant && newChat.action == "demote") {
            for (const participant of newChat.participants) {
              if (chat.participant.filter((p) => p.id == participant)[0]) {
                chat.participant.filter((p) => p.id == participant)[0].admin =
                  null;
              }
            }
          }
          if (chat.participant && newChat.action == "promote") {
            for (const participant of newChat.participants) {
              if (chat.participant.filter((p) => p.id == participant)[0]) {
                chat.participant.filter((p) => p.id == participant)[0].admin =
                  "superadmin";
              }
            }
          }
          if (is_owner) {
            Chats = Chats.filter((c) => c.id !== newChat.id);
          } else {
            Chats.filter((c) => c.id === newChat.id)[0] = chat;
          }
          await this.updateDb(Chats);
        }
      }
    } catch (e) {
      logger.error(e);
      logger.error("Error updating document failed");
    }
  }
  async fetchGroupMetadata(groupId) {
    try {
      const result = await this.instance.sock?.groupMetadata(groupId);
      return result;
    } catch (e) {
      logger.error("Error group fetch participants failed");
    }
  }
  async groupFetchAllParticipating() {
    try {
      const result = await this.instance.sock?.groupFetchAllParticipating();
      return result;
    } catch (e) {
      logger.error("Error group fetch all participating failed");
    }
  }

  // update promote demote remove
  async groupParticipantsUpdate(id, users, action) {
    try {
      const res = await this.instance.sock?.groupParticipantsUpdate(
        this.getWhatsAppId(id),
        this.parseParticipants(users),
        action,
      );
      return res;
    } catch (e) {
      //console.log(e)
      return {
        error: true,
        message:
          "unable to " +
          action +
          " some participants, check if you are admin in group or participants exists",
      };
    }
  }

  // update group settings like
  // only allow admins to send messages
  async groupSettingUpdate(id, action) {
    try {
      const res = await this.instance.sock?.groupSettingUpdate(
        this.getWhatsAppId(id),
        action,
      );
      return res;
    } catch (e) {
      //console.log(e)
      return {
        error: true,
        message: "unable to " + action + " check if you are admin in group",
      };
    }
  }

  async groupUpdateSubject(id, subject) {
    try {
      const res = await this.instance.sock?.groupUpdateSubject(
        this.getWhatsAppId(id),
        subject,
      );
      return res;
    } catch (e) {
      //console.log(e)
      return {
        error: true,
        message: "unable to update subject check if you are admin in group",
      };
    }
  }

  async groupUpdateDescription(id, description) {
    try {
      const res = await this.instance.sock?.groupUpdateDescription(
        this.getWhatsAppId(id),
        description,
      );
      return res;
    } catch (e) {
      //console.log(e)
      return {
        error: true,
        message: "unable to update description check if you are admin in group",
      };
    }
  }

  // update db document -> chat
  async updateDb(object) {
    try {
      await Chat.updateOne({ key: this.key }, { chat: object });
    } catch (e) {
      logger.error("Error updating document failed");
    }
  }

  async readMessage(msgObj) {
    try {
      const key = {
        remoteJid: msgObj.remoteJid,
        id: msgObj.id,
        participant: msgObj?.participant, // required when reading a msg from group
      };
      const res = await this.instance.sock?.readMessages([key]);
      return res;
    } catch (e) {
      logger.error("Error read message failed");
    }
  }

  async reactMessage(id, key, emoji) {
    try {
      const reactionMessage = {
        react: {
          text: emoji, // use an empty string to remove the reaction
          key: key,
        },
      };
      const res = await this.instance.sock?.sendMessage(
        this.getWhatsAppId(id),
        reactionMessage,
      );
      return res;
    } catch (e) {
      logger.error("Error react message failed");
    }
  }
}

exports.WhatsAppInstance = WhatsAppInstance;
