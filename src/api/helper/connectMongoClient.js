const { MongoClient } = require("mongodb");
const logger = require("pino")();

module.exports = async function connectToCluster(uri) {
  try {
    global.mongoClient = new MongoClient(uri);
    logger.info("STATE: Connecting to MongoDB");
    await global.mongoClient.connect();
    logger.info("STATE: Successfully connected to MongoDB");
    return global.mongoClient;
  } catch (error) {
    logger.error("STATE: Connection to MongoDB failed!", error);
    process.exit();
  }
};
