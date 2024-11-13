import { ExtendedWAMessageUpdate } from "../utils/messageTransformer";
import RedisClient from "../config/redisClient";
const redis = RedisClient.getInstance();
export enum SpamCheckResult {
  OK,
  SPAM_WARNING,
  SPAM_BLOCK,
}
async function spamCheck(message: ExtendedWAMessageUpdate): Promise<SpamCheckResult> {
  if (message.key.fromMe) {
    return SpamCheckResult.OK;
  }
  const spamIdentifier = `spam:${message.key.remoteJid}:${message.participant}:${message.text}`;
  const currentCount = await redis.incr(spamIdentifier);

  if (currentCount === 1) {
    await redis.expire(spamIdentifier, 60 * 1); // Expira em 1 minuto
  }

  return currentCount < 3 ? SpamCheckResult.OK : currentCount < 5 ? SpamCheckResult.SPAM_WARNING : SpamCheckResult.SPAM_BLOCK;
}
export default spamCheck;
