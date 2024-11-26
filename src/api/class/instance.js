/* eslint-disable no-unsafe-optional-chaining */
require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const pino = require("pino");
const {
  default: makeWASocket,
  makeInMemoryStore,
  proto,
  isJidBroadcast,
  DisconnectReason,
  isJidGroup,
  isJidNewsletter,
  Browsers,
  fetchLatestBaileysVersion,
  // isJidNewsletter,
} = require("@whiskeysockets/baileys");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const processButton = require("../helper/processbtn");
const generateVC = require("../helper/genVc");
// const Chat = require("../../models/chat.model");
const Group = require("../../models/group.model");
const axios = require("axios");
const config = require("../../config/config");
const fs = require("fs");
const logger = require("pino")();
const useMongoDBAuthState = require("../helper/mongoAuthState");
const { handleRemoval } = require("../../utils/listeners");
const useStore = !process.argv.includes("--no-store");
const NodeCache = require("node-cache");
const Message = require("../../models/message.model");
// const messageQueue = require("../../queues/messageQueue");

const store = useStore ? makeInMemoryStore({ logger }) : undefined;

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache();
const jsonPath = path.join(__dirname, "baileys_store_multi.json");
const RedisClient = require("../../config/redisClient");
const { Boom } = require("@hapi/boom");
const {
  sanitizeNumber,
  isBrazilianNumber,
} = require("../../utils/conversionHelpers");
const { getWhatsAppId } = require("../../utils/getWhatsappId");
// const { handleAntiDelete,storeMessage } = require("../helper/handleAntiDelete");
const { processMessage } = require("../../queues/ProcessMessageJob");
// const { transformMessageUpdate } = require("../../utils/messageTransformer");
const redisClient = RedisClient.getInstance();
store?.readFromFile(jsonPath);
setInterval(() => {
  store?.writeToFile(jsonPath);
}, 10000);
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
setInterval(() => cache.clear(), CACHE_TTL);

class WhatsAppInstance {
  logger = pino({ level: config.log.level });
  socketConfig = {
    retryRequestDelayMs: 350,
    maxMsgRetryCount: 4,
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 30_000,
    qrTimeout: 45_000,
    defaultQueryTimeoutMs: undefined,
    // comment the line below out
    shouldIgnoreJid: (jid) =>
      !jid || !isJidGroup(jid) || isJidNewsletter(jid) || isJidBroadcast(jid),
    // implement to handle retries
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
    cachedGroupMetadata: async (jid) => {
      return store?.fetchGroupMetadata(jid, this.instance.sock);
    },
    getMessage: async (key) => {
      const cached = cache.get(key.id);
      if (cached) return cached;
      return { conversation: null };
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
    sock: {},
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
    this.collection = global.mongoClient
      .db("whatsapp-api")
      .collection(this.key);
    const { version } = await fetchLatestBaileysVersion();
    this.socketConfig.version = version;
    const { state, saveCreds } = await useMongoDBAuthState(this.collection);
    this.authState = { state: state, saveCreds: saveCreds };
    this.socketConfig.auth = this.authState.state;
    this.socketConfig.browser = Object.values(config.browser);
    this.instance.sock = makeWASocket(this.socketConfig);
    this.instance.sock.public = true;
    store?.bind(this.instance.sock.ev);
    this.setHandler();
    return this;
  }
  async loadAvailableGroups() {
    try {
      const groups = await Group.find().exec();
      this.instance.availableGroups = groups.map((group) => ({
        groupId: group.groupId,
        blockedCommands: group.blockedCommands || [],
        allowOffenses: group.allowOffenses || false,
        blackListedUsers: group.blackListedUsers || [],
      }));
      this.logger.info(
        `Available groups loaded ${this.instance.availableGroups.length}`,
      );
      return this.instance.availableGroups;
    } catch (error) {
      this.logger.error(`Error loading available groups ${error}`);
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
          this.logger.info("Groups metadata loaded successfully.");
          return data;
        })
        .catch((error) => {
          this.logger.error(`Error loading group metadata loop ${error}`);
        });
      return fetchData;
    } catch (error) {
      this.logger.error(`Error getting group metadata ${error}`);
    }
  }
  /**
   * @description Register a group to the instance and save it to the database
   * @param {string} groupId
   */
  async registerGroup(groupId) {
    try {
      const group = new Group({ key: this.key, groupId: groupId });
      await group.save();
      this.instance.availableGroups.push(group);
      this.logger.info("Group registered");
    } catch (error) {
      this.logger.error(`Error registering group ${error}`);
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
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return;
      }
      await existentGroup.deleteOne();
      this.instance.availableGroups = this.instance.availableGroups.filter(
        (g) => g.groupId !== groupId,
      );
      this.logger.info("Group unregistered");
    } catch (error) {
      this.logger.error(`Error unregister group ${error}`);
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
        this.logger.info("Group not available");
        return;
      }
      const group = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!group) {
        this.logger.info("Group not found");
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
      this.logger.info("Command added to blocked list");
    } catch (error) {
      this.logger.error(`Error adding command to blocked list ${error}`);
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
        this.logger.info("Group not available");
        return;
      }
      const group = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!group) {
        this.logger.info("Group not found");
        return;
      }
      if (!group.blockedCommands) {
        group.blockedCommands = [];
        this.logger.info("No commands blocked");
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
      this.logger.info("Command removed from blocked list");
    } catch (error) {
      this.logger.error(`Error removing command from blocked list ${error}`);
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
        this.logger.info("Group not available");
        return;
      }
      const group = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!group) {
        this.logger.info("Group not found");
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
      this.logger.info("Number added to blocked list");
    } catch (error) {
      this.logger.error(`Error adding number to blocked list ${error}`);
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
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.badSession) {
          console.log(
            `Bad Session File, Please Delete auth_info_baileys and Scan Again`,
          );
          sock.logout();
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log("Connection closed, reconnecting....");
          this.init();
        } else if (reason === DisconnectReason.connectionLost) {
          console.log("Connection Lost from Server, reconnecting...");
          this.init();
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log(
            "Connection Replaced, Another New Session Opened, Please Close Current Session First",
          );
          sock.logout();
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(
            `Device Logged Out, Please Delete auth_info_baileys and Scan Again.`,
          );
          try {
            sock.init();
          } catch (error) {
            this.logger.error(`Error logging out ${error}`);
          }
          await this.deleteInstance(this.key);
          sock.ev.removeAllListeners();
        } else if (reason === DisconnectReason.restartRequired) {
          console.log("Restart Required, Restarting...");
          this.init();
        } else if (reason === DisconnectReason.timedOut) {
          console.log("Connection TimedOut, Reconnecting...");
          this.init();
        } else {
          sock.end(
            `Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`,
          );
        }
      }
      // if (connection === "close") {
      //   // reconnect if not logged out
      //   if (
      //     lastDisconnect?.error?.output?.statusCode !==
      //     DisconnectReason.loggedOut
      //   ) {
      //     await this.init();
      //   } else {
      //     await this.collection.drop().then(() => {
      //       this.logger.info("STATE: Dropped collection");
      //     });
      //     this.instance.online = false;
      //   }

      //   if (
      //     ["all", "connection", "connection.update", "connection:close"].some(
      //       (e) => config.webhookAllowedEvents.includes(e),
      //     )
      //   )
      //     await this.SendWebhook(
      //       "connection",
      //       {
      //         connection: connection,
      //       },
      //       this.key,
      //     );
      else if (connection === "open") {
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
            this.close();
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
      // await this.updateDb(this.instance.chats);
      // await this.updateDbGroupsParticipants();
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
      // changedChat.map((chat) => {
      //   const index = this.instance.chats.findIndex((pc) => pc.id === chat.id);
      //   const PrevChat = this.instance.chats[index];
      //   this.instance.chats[index] = {
      //     ...PrevChat,
      //     ...chat,
      //   };
      // });
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

    // on new message
    sock?.ev.on("messages.upsert", async (receivedMessages) => {
      try {
        const latestReceivedMessage = receivedMessages.messages[0];
        if (!latestReceivedMessage.message) return;
        latestReceivedMessage.message =
          Object.keys(latestReceivedMessage.message)[0] === "ephemeralMessage"
            ? latestReceivedMessage.message.ephemeralMessage.message
            : latestReceivedMessage.message;
        if (
          latestReceivedMessage.key &&
          latestReceivedMessage.key.remoteJid === "status@broadcast"
        )
          return;
        if (
          !this.instance.sock.public &&
          !latestReceivedMessage.key.fromMe &&
          receivedMessages.type === "notify"
        )
          return;
        if (
          latestReceivedMessage.key.id.startsWith("BAE5") &&
          latestReceivedMessage.key.id.length === 16
        )
          return;
        if (latestReceivedMessage.messageStubParameters) {
          const cannotDecrypt = Array.from(
            latestReceivedMessage.messageStubParameters,
          ).find((msg) =>
            String(msg).includes("No session found to decrypt message"),
          );
          if (cannotDecrypt) return;
        }
        const messageId = latestReceivedMessage.key.id;
        const isProcessed = await redisClient.get(`processed:${messageId}`);
        if (isProcessed) {
          this.logger.info(`Mensagem já processada: ${messageId}`);
          return;
        }
        const unreadMessages = receivedMessages.messages.map((msg) => {
          return {
            remoteJid: msg.key.remoteJid,
            id: msg.key.id,
            participant: msg.key?.participant,
          };
        });
        await sock.readMessages(unreadMessages);
        processMessage({
          message: latestReceivedMessage,
          key: this.key,
          store: store,
          logger: this.logger,
        });
        // if (!messageQueue) {
        //   this.logger.error(`messageQueue não foi inicializada`);
        //   return;
        // }
        // messageQueue.add({
        //   message: latestReceivedMessage,
        //   key: this.key,
        //   store: store,
        //   logger: this.logger,
        // });
        // // Marcar a mensagem como processada
        // await redisClient.set(
        //   `processed:${messageId}`,
        //   "true",
        //   "EX",
        //   60 * 60 * 24,
        // ); // Expira em 24 horas
      } catch (err) {
        console.log(err);
      }
      return;
      // const m = receivedMessages.messages[0];
      // try {
      //   this.logger.debug(`📩 Upsert message:`, m);
      // } catch (error) {
      //   this.logger.error(`❌ Error handling messages.upsert event:`, error);
      // }
      // if (receivedMessages.type === "prepend")
      //   this.instance.messages.unshift(...receivedMessages.messages);
      // if (receivedMessages.type !== "notify") return;

      // // https://adiwajshing.github.io/Baileys/#reading-messages
      // if (config.markMessagesRead) {

      // }

      // this.instance.messages.unshift(...receivedMessages.messages);

      // for (const msg of receivedMessages.messages) {
      //   if (!msg.message) continue;

      //   const messageType = Object.keys(msg.message)[0];

      //   if (["protocolMessage"].includes(messageType)) {
      //     continue;
      //   }

      //   const webhookData = {
      //     key: this.key,
      //     ...msg,
      //   };

      //   if (config.webhookBase64) {
      //     switch (messageType) {
      //       case "imageMessage":
      //         webhookData["msgContent"] = await downloadMessage(
      //           msg.message.imageMessage,
      //           "image",
      //         );
      //         break;
      //       case "videoMessage":
      //         webhookData["msgContent"] = await downloadMessage(
      //           msg.message.videoMessage,
      //           "video",
      //         );
      //         break;
      //       case "audioMessage":
      //         webhookData["msgContent"] = await downloadMessage(
      //           msg.message.audioMessage,
      //           "audio",
      //         );
      //         break;
      //       default:
      //         webhookData["msgContent"] = "";
      //         break;
      //     }
      //   }

      //   if (
      //     ["all", "messages", "messages.upsert"].some((e) =>
      //       config.webhookAllowedEvents.includes(e),
      //     )
      //   ) {
      //     await this.SendWebhook("message", webhookData, this.key);
      //   }
      // }
    });

    sock?.ev.on("messages.update", async (messages) => {
      console.log("messages.update");
      // await handleAntiDelete(sock, messages);
      //console.dir(messages);
    });
    // sock?.ws.on("CB:call", async (data) => {
    //   if (data.content) {
    //     if (data.content.find((e) => e.tag === "offer")) {
    //       const content = data.content.find((e) => e.tag === "offer");
    //       if (
    //         ["all", "call", "CB:call", "call:offer"].some((e) =>
    //           config.webhookAllowedEvents.includes(e),
    //         )
    //       )
    //         await this.SendWebhook(
    //           "call_offer",
    //           {
    //             id: content.attrs["call-id"],
    //             timestamp: parseInt(data.attrs.t),
    //             user: {
    //               id: data.attrs.from,
    //               platform: data.attrs.platform,
    //               platform_version: data.attrs.version,
    //             },
    //           },
    //           this.key,
    //         );
    //     } else if (data.content.find((e) => e.tag === "terminate")) {
    //       const content = data.content.find((e) => e.tag === "terminate");

    //       if (
    //         ["all", "call", "call:terminate"].some((e) =>
    //           config.webhookAllowedEvents.includes(e),
    //         )
    //       )
    //         await this.SendWebhook(
    //           "call_terminate",
    //           {
    //             id: content.attrs["call-id"],
    //             user: {
    //               id: data.attrs.from,
    //             },
    //             timestamp: parseInt(data.attrs.t),
    //             reason: data.content[0].attrs.reason,
    //           },
    //           this.key,
    //         );
    //     }
    //   }
    // });
    sock.ws.on("CB:notification,addressing_mode:pn", async (node) => {
      const { from: groupId, content } = node.attrs;
      const user = this.instance?.online ? this.instance.sock?.user : {};
      const events = Array.from(node.content);

      events.forEach(async (event) => {
        const { tag, content: eventContent } = event;

        if (tag === "add") {
          try {
            const group = await Group.findOne({ groupId: groupId }).exec();
            if (!group) return;
            const mentions = Array.from(eventContent).map((ev) => {
              const { attrs } = ev;
              return attrs.jid || "";
            });
            const messageMentions = mentions.map(
              (mention) => `@${mention.split("@")[0]}`,
            );
            if (group.welcomeMessage) {
              this.instance.sock.sendMessage(groupId, {
                text: `${group.welcomeMessage} ${messageMentions.join(" ")}`,
                mentions: mentions,
              });
              return;
            }
            eventContent.forEach(async (ev) => {
              if ("participant" in ev) {
                const { attrs } = ev.participant;
                const number = sanitizeNumber(attrs.jid);
                if (
                  (group.onlyBrazil && !isBrazilianNumber(number)) ||
                  group.blackListedUsers.includes(attrs.jid)
                ) {
                  sock.sendMessage(groupId, {
                    text: `Este grupo é restrito a números brasileiros`,
                  });
                  const result = await sock.groupParticipantsUpdate(
                    groupId,
                    [getWhatsAppId(number)],
                    "remove",
                  );
                  if (
                    result &&
                    result.length > 0 &&
                    result[0].status == "200"
                  ) {
                    this.this.logger.info("Participant removed");
                  } else {
                    this.this.logger.info("Participant not removed");
                  }
                  return;
                }
              }
            });
          } catch (error) {
            this.logger.error(`Error adding user to group ${groupId}`);
          }
          this.logger.info(`A user has been added to group ${groupId}`);
        } else if (tag === "remove") {
          this.logger.info(`A user has been removed from the group ${groupId}`);
          handleRemoval(eventContent, groupId, user, this.unregisterGroup);
        }
      });
    });
    sock?.ev.on("groups.upsert", async (newChat) => {
      //console.log('groups.upsert')
      //console.log(newChat)
      // this.createGroupByApp(newChat);
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
      // this.updateGroupSubjectByApp(newChat);
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
      // this.updateGroupParticipantsByApp(newChat);
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
    sock?.ev.flush();
  }

  close() {
    this.instance.sock.ws.close();
    // remove all events
    this.instance.sock.ev.removeAllListeners();
    this.instance.qr = " ";
    this.logger.info("socket connection terminated");
  }

  async deleteInstance(key) {
    try {
      // await Chat.findOneAndDelete({ key: key });
      const collection = global.mongoClient.db("whatsapp-api").collection(key);
      collection.drop();
      this.instance.online = false;
      this.logger.info(`Instance ${key} deleted`);
    } catch (e) {
      this.logger.error("Error updating document failed");
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

  async DownloadProfile(whatsappUser) {
    await this.verifyId(this.getWhatsAppId(whatsappUser));
    const ppUrl = await this.instance.sock?.profilePictureUrl(
      this.getWhatsAppId(whatsappUser),
      "image",
    );
    return ppUrl;
  }

  async getUserStatus(whatsappUser) {
    await this.verifyId(this.getWhatsAppId(whatsappUser));
    const status = await this.instance.sock?.fetchStatus(
      this.getWhatsAppId(whatsappUser),
    );
    return status;
  }
  async getPairCode(phoneNumber) {
    try {
      const pairCode =
        await this.instance.sock?.requestPairingCode(phoneNumber);
      if (pairCode) {
        return pairCode;
      }
      if (!this.instance.sock.authState.creds.pairingCode) {
        let code = await this.instance.sock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        return code;
      }
      return this.instance.sock.authState.creds.pairingCode;
    } catch (error) {
      this.logger.error(`Error getting pairing code ${error}`);
    }
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
  // async getUserOrGroupById(id) {
  //   try {
  //     let Chats = await this.getChat();
  //     const group = Chats.find((c) => c.id === this.getWhatsAppId(id));
  //     if (!group)
  //       throw new Error("unable to get group, check if the group exists");
  //     return group;
  //   } catch (e) {
  //     this.logger.error(e);
  //     this.logger.error("Error get group failed");
  //   }
  // }

  // Group Methods
  parseParticipants(users) {
    return users.map((users) => this.getWhatsAppId(users));
  }

  async updateDbGroupsParticipants() {
    try {
      let groups = await this.groupFetchAllParticipating();
      // let Chats = await this.getChat();
      let Chats = this.instance.chats;
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
      this.logger.error(e);
      this.logger.error("Error updating groups failed");
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
      this.logger.error(e);
      this.logger.error("Error create new group failed");
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
  /**
   *
   * @param {string} groupId
   * @param {string[]} participantIds
   * @returns
   */
  async makeAdmin(groupId, participantIds) {
    try {
      const res = await this.instance.sock?.groupParticipantsUpdate(
        this.getWhatsAppId(groupId),
        this.parseParticipants(participantIds),
        "promote", // replace this parameter with "remove", "demote" or "promote"
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
  /**
   *
   * @param {string} groupID
   * @param {string[]} participantIds
   * @returns
   */
  async demoteAdmin(groupId, participantIds) {
    try {
      const res = await this.instance.sock?.groupParticipantsUpdate(
        this.getWhatsAppId(groupId),
        this.parseParticipants(participantIds),
        "demote", // replace this parameter with "remove", "demote" or "promote"
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
      this.logger.error(e);
      this.logger.error("Error leave group failed");
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
      this.logger.error(e);
      this.logger.error("Error get invite group failed");
    }
  }

  async getInstanceInviteCodeGroup(id) {
    try {
      return await this.instance.sock?.groupInviteCode(id);
    } catch (e) {
      this.logger.error(e);
      this.logger.error("Error get invite group failed");
    }
  }

  // get Chat object from db
  // async getChat(key = this.key) {
  //   let dbResult = await Chat.findOne({ key: key }).exec();
  //   let ChatObj = dbResult.chat;
  //   return ChatObj;
  // }

  // create new group by application
  // async createGroupByApp(newChat) {
  //   try {
  //     let Chats = await this.getChat();
  //     let group = {
  //       id: newChat[0].id,
  //       name: newChat[0].subject,
  //       participant: newChat[0].participants,
  //       messages: [],
  //       creation: newChat[0].creation,
  //       subjectOwner: newChat[0].subjectOwner,
  //     };
  //     Chats.push(group);
  //     await this.updateDb(Chats);
  //   } catch (e) {
  //     this.logger.error(e);
  //     this.logger.error("Error updating document failed");
  //   }
  // }

  // async updateGroupSubjectByApp(newChat) {
  //   //console.log(newChat)
  //   try {
  //     if (newChat[0] && newChat[0].subject) {
  //       let Chats = await this.getChat();
  //       const chat = Chats.find((c) => c.id === newChat[0].id);
  //       if (!chat) {
  //         this.logger.info("Group not found");
  //         return;
  //       }
  //       chat.name = newChat[0].subject;
  //       await this.updateDb(Chats);
  //     }
  //   } catch (e) {
  //     this.logger.error(e);
  //     this.logger.error("Error updating document failed");
  //   }
  // }

  // async updateGroupParticipantsByApp(newChat) {
  //   //console.log(newChat)
  //   try {
  //     if (newChat && newChat.id) {
  //       let Chats = await this.getChat();
  //       let chat = Chats.find((c) => c.id === newChat.id);
  //       let is_owner = false;
  //       if (chat) {
  //         if (chat.participant == undefined) {
  //           chat.participant = [];
  //         }
  //         if (chat.participant && newChat.action == "add") {
  //           for (const participant of newChat.participants) {
  //             chat.participant.push({
  //               id: participant,
  //               admin: null,
  //             });
  //           }
  //         }
  //         if (chat.participant && newChat.action == "remove") {
  //           for (const participant of newChat.participants) {
  //             // remove group if they are owner
  //             if (chat.subjectOwner == participant) {
  //               is_owner = true;
  //             }
  //             chat.participant = chat.participant.filter(
  //               (p) => p.id != participant,
  //             );
  //           }
  //         }
  //         if (chat.participant && newChat.action == "demote") {
  //           for (const participant of newChat.participants) {
  //             if (chat.participant.filter((p) => p.id == participant)[0]) {
  //               chat.participant.filter((p) => p.id == participant)[0].admin =
  //                 null;
  //             }
  //           }
  //         }
  //         if (chat.participant && newChat.action == "promote") {
  //           for (const participant of newChat.participants) {
  //             if (chat.participant.filter((p) => p.id == participant)[0]) {
  //               chat.participant.filter((p) => p.id == participant)[0].admin =
  //                 "superadmin";
  //             }
  //           }
  //         }
  //         if (is_owner) {
  //           Chats = Chats.filter((c) => c.id !== newChat.id);
  //         } else {
  //           Chats.filter((c) => c.id === newChat.id)[0] = chat;
  //         }
  //         await this.updateDb(Chats);
  //       }
  //     }
  //   } catch (e) {
  //     this.logger.error(e);
  //     this.logger.error("Error updating document failed");
  //   }
  // }
  async fetchGroupMetadata(groupId) {
    try {
      const result = await this.instance.sock?.groupMetadata(groupId);
      return result;
    } catch (e) {
      this.logger.error("Error group fetch participants failed");
    }
  }
  async groupFetchAllParticipating() {
    try {
      const result = await this.instance.sock?.groupFetchAllParticipating();
      return result;
    } catch (e) {
      this.logger.error("Error group fetch all participating failed");
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
  // async updateDb(object) {
  //   try {
  //     await Chat.updateOne({ key: this.key }, { chat: object });
  //   } catch (e) {
  //     this.logger.error("Error updating document failed");
  //   }
  // }

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
      this.logger.error("Error read message failed");
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
      this.logger.error("Error react message failed");
    }
  }
}
const deleteOldMessages = async () => {
  const retentionPeriod = 30; // Número de dias para manter as mensagens
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);

  try {
    const oldMessages = await Message.find({ timestamp: { $lt: cutoffDate } });
    for (const message of oldMessages) {
      await message.remove();
    }
    console.log(`Deleted ${oldMessages.length} old messages`);
  } catch (err) {
    console.log(`Error deleting old messages: ${err}`);
  }
};

// Chamar a função periodicamente
setInterval(deleteOldMessages, 24 * 60 * 60 * 1000); // Executar uma vez por dia

exports.WhatsAppInstance = WhatsAppInstance;
let file = require.resolve(__filename, "baileys_store_multi.json");
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(this.logger.info(`Update ${file}`));
  delete require.cache[file];
  require(file);
});
