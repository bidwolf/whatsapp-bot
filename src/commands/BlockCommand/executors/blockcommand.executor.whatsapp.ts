import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import Group from '../../../models/group.model';

export default class WhatsappBlockCommandExecutor implements IExecutor<WhatsAppMessage> {
  private async blockCommand(groupId: string, command: string): Promise<boolean> {
    try {
      if (command === 'on' || command === 'off' || command === 'bot') {
        return false
      }
      const existentGroup = await Group.findOne({
        groupId: groupId,
      }).exec();
      if (!existentGroup) {
        this.logger.info("Group not found");
        return false;
      }
      if (!existentGroup.blockedCommands) {
        existentGroup.blockedCommands = []
      }
      if (existentGroup.blockedCommands.includes(command)) {
        return true
      }
      existentGroup.blockedCommands.push(command)
      await existentGroup.save();
      return true
    } catch (e) {
      this.logger.error(e)
      return false
    }
  }
  async execute({ command }: WhatsAppMessage): Promise<void> {
    const args = command?.args
    if (!args) {
      throw new Error('Args not found')
    }
    let commandToBlock = args
    if (command.args && typeof command.args === 'object') {
      commandToBlock = command.args[0]
    }
    const isCommandBlocked = await this.blockCommand(command.groupId || '', commandToBlock)
    if (isCommandBlocked) {
      this.result = (this.generateSuccessMessage(commandToBlock))
      return
    }

  }
  private generateSuccessMessage(commandToBlock: string): IExecutionResult {
    return {
      message: `Comando ${commandToBlock} bloqueado com sucesso`,
      status: '200'
    }
  }
  result: IExecutionResult = undefined;

  constructor(private readonly logger: Logger) { }
}
