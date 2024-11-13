import fs from 'fs';
import { BaseCommand } from './commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from './messageTransformer';
import { IGroup } from '../api/models/group.model';
import { TBaileysInMemoryStore } from '../api/class/BaileysInMemoryStore';
import pino from 'pino';
const logger = pino()

interface CommandConstructor {
    new(): BaseCommand;
}
const commandClasses: CommandConstructor[] = [
    require('../commands/Add').default,
    require('../commands/Adm').default,
    require('../commands/Ban').default,
    require('../commands/BlockCommand').default,
    require('../commands/DeleteMessage').default,
    require('../commands/Description').default,
    require('../commands/Desmute').default,
    require('../commands/EnableCommand').default,
    require('../commands/Flood').default,
    require('../commands/Link').default,
    require('../commands/Mute').default,
    require('../commands/NotifyAllMembers').default,
    require('../commands/Offenses').default,
    require('../commands/Rename').default,
    require('../commands/RevokeLink').default,
    require('../commands/Rules').default,
    require('../commands/ToggleBotStatus').default,
    require('../commands/ToggleBrazilianOnly').default,
    require('../commands/ToggleChat').default,
    require('../commands/ToggleNFSW').default,
    require('../commands/ToggleShareInvite').default,
    require('../commands/UpdateStatus').default,
    require('../commands/WelcomeMessage').default,
];
/**
 * CommandDispatcher
 * @description Dispatches commands to the appropriate command class
 * @author Bidwolf
 */
class CommandDispatcher {
    private readonly logger = pino()
    commands: Map<string, BaseCommand> = new Map()
    private registerCommands() {
        commandClasses.forEach(CommandClass => {
            const commandInstance = new CommandClass();
            this.commands.set(commandInstance.command_name, commandInstance);
        });
    }
    constructor(private readonly instance: ExtendedWaSocket, private readonly m: ExtendedWAMessageUpdate, private readonly group: IGroup, private readonly store: TBaileysInMemoryStore) {
        this.registerCommands()
    }
    async run() {
        const command = this.m.command
        if (!command) return
        const cmd = this.commands.get(command.command_name)
        if (!cmd) return
        if (!this.group) {
            this.logger.error('Group not provided')
            return
        }
        try {
            await cmd.execute(this.m, this.instance, this.store)
        } catch (e) {
            this.logger.error(e)
        }
    }
}
const initializeCommandDispatcher = async (instance: ExtendedWaSocket, m: ExtendedWAMessageUpdate, group: IGroup, store: TBaileysInMemoryStore) => {
    try {
        const app = new CommandDispatcher(instance, m, group, store);
        app.run()
    } catch (e) {
        logger.error(e);
    }
};
export default initializeCommandDispatcher
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    logger.info(`Update ${file}`)
    delete require.cache[file]
    require(file)
})
