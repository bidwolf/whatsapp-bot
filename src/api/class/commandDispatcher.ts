import { WAMessage } from "@whiskeysockets/baileys";
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "./messageTransformer";
import { TBaileysInMemoryStore } from "./BaileysInMemoryStore";
import Ban from "../commands/Ban";
import { BaseCommand } from "../../utils/commands";
import Add from "../commands/Add";
import Adm from "../commands/Adm";
import GroupLink from "../commands/Link";
import RevokeLink from "../commands/RevokeLink";
import Description from "../commands/Description";
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
    constructor(private readonly instance: ExtendedWaSocket, private readonly m: ExtendedWAMessageUpdate, chatUpdate: WAMessage[], private readonly store: TBaileysInMemoryStore) {
        const ban = new Ban()
        const add = new Add()
        const adm = new Adm()
        const link = new GroupLink()
        const revokeLink = new RevokeLink()
        const description = new Description()
        this.commands.set(ban.command_name, ban)
        this.commands.set(add.command_name, add)
        this.commands.set(adm.command_name, adm)
        this.commands.set(link.command_name, link)
        this.commands.set(revokeLink.command_name, revokeLink)
        this.commands.set(description.command_name, description)
    }
    async run() {
        const command = this.m.command
        if (!command) return
        const cmd = this.commands.get(command.command_name)
        if (!cmd) return
        try {
            await cmd.execute(this.m, this.instance, this.store)
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
