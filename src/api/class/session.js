/* eslint-disable no-unsafe-optional-chaining */
const { WhatsAppInstance } = require("../class/instance");
const logger = require("pino")();
const config = require("../../config/config");

class Session {
  async restoreSessions() {
    let restoredSessions = new Array();
    let allCollections = [];
    try {
      const db = global.mongoClient.db("whatsapp-api");
      const result = await db.listCollections().toArray();
      result.forEach((collection) => {
        allCollections.push(collection.name);
      });

      for (const key of allCollections) {
        const webhook = config.webhookEnabled
          ? config.webhookEnabled
          : undefined;
        const webhookUrl = config.webhookUrl ? config.webhookUrl : undefined;
        if (global.WhatsAppInstances[key]) {
          logger.info(`Instance ${key} already exists`);
          continue;
        }
        const instance = new WhatsAppInstance(key, webhook, webhookUrl);
        await instance.init();
        global.WhatsAppInstances[key] = instance;
        restoredSessions.push(key);
      }
    } catch (e) {
      logger.error("Error restoring sessions");
      logger.error(e);
    }
    return restoredSessions;
  }
}

exports.Session = Session;
