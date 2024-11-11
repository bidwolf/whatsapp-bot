import { ExtendedWAMessageUpdate, ExtendedWaSocket } from "./messageTransformer";
import { TBaileysInMemoryStore } from "./BaileysInMemoryStore";
import Ban from "../commands/Ban";
import { BaseCommand } from "../../utils/commands";
import Add from "../commands/Add";
import Adm from "../commands/Adm";
import GroupLink from "../commands/Link";
import RevokeLink from "../commands/RevokeLink";
import Description from "../commands/Description";
import Rename from "../commands/Rename";
import Rules from "../commands/Rules";
import ToggleChat from "../commands/ToggleChat";
import { IGroup } from "../models/group.model";
import Offenses from "../commands/Offenses";
import DeleteMessage from "../commands/DeleteMessage";
import BlockCommand from "../commands/BlockCommand";
import EnableCommand from "../commands/EnableCommand";
import MuteCommand from "../commands/Mute";
import UnmuteCommand from "../commands/Desmute";
import Flood from "../commands/Flood";
import fs from 'fs';
import ToggleBrazilianOnly from "../commands/ToggleBrazilianOnly";
import WelcomeMessage from "../commands/WelcomeMessage";
const pino = require('pino')()
/**
 * CommandDispatcher
 * @description Dispatches commands to the appropriate command class
 * @author Bidwolf
 */
class CommandDispatcher {
    private readonly logger = pino
    commands: Map<string, BaseCommand> = new Map()
    constructor(private readonly instance: ExtendedWaSocket, private readonly m: ExtendedWAMessageUpdate, private readonly group: IGroup, private readonly store: TBaileysInMemoryStore) {
        const ban = new Ban()
        const add = new Add()
        const adm = new Adm()
        const link = new GroupLink()
        const revokeLink = new RevokeLink()
        const description = new Description()
        const rename = new Rename()
        const rules = new Rules()
        const toggleChat = new ToggleChat()
        const offenses = new Offenses()
        const deleteMessage = new DeleteMessage()
        const blockedCommands = new BlockCommand()
        const enableCommand = new EnableCommand()
        const muteCommand = new MuteCommand()
        const unMuteCommand = new UnmuteCommand()
        const flood = new Flood()
        const toggleBrazilianOnly = new ToggleBrazilianOnly()
        const welcomeMessage = new WelcomeMessage()
        this.commands.set(ban.command_name, ban)
        this.commands.set(add.command_name, add)
        this.commands.set(adm.command_name, adm)
        this.commands.set(link.command_name, link)
        this.commands.set(revokeLink.command_name, revokeLink)
        this.commands.set(description.command_name, description)
        this.commands.set(rename.command_name, rename)
        this.commands.set(rules.command_name, rules)
        this.commands.set(toggleChat.command_name, toggleChat)
        this.commands.set(offenses.command_name, offenses)
        this.commands.set(deleteMessage.command_name, deleteMessage)
        this.commands.set(enableCommand.command_name, enableCommand)
        this.commands.set(blockedCommands.command_name, blockedCommands)
        this.commands.set(muteCommand.command_name, muteCommand)
        this.commands.set(unMuteCommand.command_name, unMuteCommand)
        this.commands.set(flood.command_name, flood)
        this.commands.set(toggleBrazilianOnly.command_name, toggleBrazilianOnly)
        this.commands.set(welcomeMessage.command_name, welcomeMessage)
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
        if (this.group.blockedCommands.includes(command.command_name) && !['on', 'off'].includes(command.command_name)) {
            this.logger.info(`Command ${command.command_name} is blocked`)
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
        console.error(e);
    }
};
export default initializeCommandDispatcher
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(pino.info(`Update ${file}`))
    delete require.cache[file]
    require(file)
})
