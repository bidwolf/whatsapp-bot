import { WAMessage } from "@whiskeysockets/baileys";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "./myfunc";
import { TBaileysInMemoryStore } from "./BaileysInMemoryStore";
import Ban from "../commands/Ban";
import { BaseCommand } from "../../utils/commands";
import Add from "../commands/Add";
import Adm from "../commands/Adm";
const fs = require('fs');
const pino = require('pino')()
/**
 * CommandDispatcher
 * @description Dispatches commands to the appropriate command class
 * @author Bidwolf
 */
class CommandDispatcher {
    private readonly logger = pino
    commands: Map<string, BaseCommand> = new Map()
    constructor(instance: ExtendedWaSocket, private readonly m: ExtendedWAMessageUpdate, chatUpdate: WAMessage[], store: TBaileysInMemoryStore) {
        const ban = new Ban(this.m, instance, store)
        const add = new Add(this.m, instance, store)
        const adm = new Adm(this.m, instance, store)
        this.commands.set('ban', ban)
        this.commands.set('add', add)
        this.commands.set('adm', adm)
    }
    async run() {
        const command = this.m.command
        if (!command) return
        const cmd = this.commands.get(command.command_name)
        if (!cmd) return
        try {
            await cmd.execute(this.m)
        } catch (e) {
            this.logger.error(e)
        }
    }
}
const initializeCommandDispatcher = async (instance: ExtendedWaSocket, m: ExtendedWAMessageUpdate, chatUpdate: WAMessage[], store: TBaileysInMemoryStore) => {
    try {
        const app = new CommandDispatcher(instance, m, chatUpdate, store);
        app.run()
    } catch (e) {
        console.error(e);
    }
};
module.exports = initializeCommandDispatcher;
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(pino.info(`Update ${file}`))
    delete require.cache[file]
    require(file)
})
