import Queue from 'bull'
import { ProcessMessageJobData } from './ProcessMessageJob'
import RedisClient from '../config/redisClient';

const messageQueue = new Queue<ProcessMessageJobData>('messageQueue', {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return RedisClient.createClient();
      case 'subscriber':
        return RedisClient.createSubscriber();
      default:
        return RedisClient.getInstance();
    }
  },
})
export default messageQueue
module.exports = messageQueue
