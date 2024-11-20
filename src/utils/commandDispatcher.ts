import fs from 'fs';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from './messageTransformer';
import pino, { Logger } from 'pino';
import { CommandDispatcher } from '../dispatchers';
import { WhatsAppGroupSocket } from '../sockets/WhatsappSocket';
import { WhatsAppMessage } from '../messages/WhatsappMessage';
import { CreateCommandFactory } from '../commands';
import { LoggerFeedback } from '../feedback/loggerFeedback';
const logger = pino()


const commandClasses: CreateCommandFactory<WhatsAppMessage>[] = [
    require('../commands/Add').default,
    require('../commands/Adm').default,
    require('../commands/All').default,
    require('../commands/Ban').default,
    require('../commands/BlockCommand').default,
    require('../commands/DeleteMessage').default,
    require('../commands/Description').default,
    require('../commands/EnableCommand').default,
    require('../commands/GroupLink').default,
    require('../commands/MuteCommand').default,
    require('../commands/OnlyAdminChat').default,
    require('../commands/Rename').default,
    require('../commands/RevokeLink').default,
    require('../commands/Rules').default,
    require('../commands/ToggleBotStatus').default,
    require('../commands/ToggleFlood').default,
    require('../commands/ToggleNSFW').default,
    require('../commands/ToggleOffenses').default,
    require('../commands/ToggleShareInvite').default,
    require('../commands/UnmuteCommand').default,
    require('../commands/UpdateStatus').default,
    require('../commands/WelcomeMessage').default,
];

const initializeWhatsappCommandDispatcher = async (socket: ExtendedWaSocket, m: ExtendedWAMessageUpdate, logger: Logger) => {
    try {
        const waSocket = new WhatsAppGroupSocket(socket)
        const waMessage = new WhatsAppMessage(m)
        const feedbackSender = new LoggerFeedback()
        const factories = commandClasses.map(factory => {
            return factory(feedbackSender, logger)
        })
        const app = new CommandDispatcher(waSocket, waMessage, factories, logger);
        app.dispatchCommand()
    } catch (e) {
        logger.error(e);
    }
};
export default initializeWhatsappCommandDispatcher
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    logger.info(`Update ${file}`)
    delete require.cache[file]
    require(file)
})
