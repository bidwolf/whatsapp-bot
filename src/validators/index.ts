import { GroupMetadata } from "@whiskeysockets/baileys"
import { BotCommand, Method } from "../utils/commands"
import { MessageReply } from "../utils/messageTransformer"

export type ValidateProps = { command?: BotCommand, method?: Method, metadata?: GroupMetadata, reply?: MessageReply }
export type CommandValidator = {
  validate(props: ValidateProps): Promise<Boolean>
}
