import Redis, { Redis as RedisType } from 'ioredis';
const config = require('./config');
import P from 'pino';

const logger = P();

class RedisClient {
  private static instance: RedisType;

  private constructor() { }

  public static getInstance(): RedisType {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port ? Number(config.redis.port) : 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      RedisClient.instance.on('connect', () => {
        logger.info('Connected to Redis');
      });

      RedisClient.instance.on('error', (err) => {
        logger.error(`Error connecting to Redis: ${err}`);
      });
    }

    return RedisClient.instance;
  }
  public static createClient(): RedisType {
    return new Redis({
      host: config.redis.host,
      port: config.redis.port ? Number(config.redis.port) : 6379,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }

  public static createSubscriber(): RedisType {
    return new Redis({
      host: config.redis.host,
      port: config.redis.port ? Number(config.redis.port) : 6379,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }
}
module.exports = RedisClient;
export default RedisClient;
