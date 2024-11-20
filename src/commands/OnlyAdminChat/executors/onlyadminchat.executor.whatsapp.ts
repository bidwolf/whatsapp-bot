import { type Logger } from 'pino';
import { IExecutionResult, IExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
import { GroupCommunicationSocket } from '../../../sockets';
import { COMMAND_PREFIX, ERROR_MESSAGES } from '../../../utils/constants';

export default class WhatsappExecutor implements IExecutor<WhatsAppMessage> {
  async execute({ command }: WhatsAppMessage): Promise<void> {
    if (!command?.groupId) {
      this.result = { message: ERROR_MESSAGES.UNKNOWN, status: '400' }
      return;
    }
    let toggleCommandArgs = command?.args
    if (command?.args && typeof command?.args === 'object') {
      toggleCommandArgs = command?.args[0]
    }
    if (toggleCommandArgs === 'on') {
      await this.instance.restrictGroupMessagesToAdmin(command.groupId)
      this.result = {
        message: this.formatToggleCommandResponse(toggleCommandArgs),
        status: '200'
      }
      return
    }
    if (toggleCommandArgs === 'off') {
      await this.instance.enableGroupMessagesToAll(command.groupId)
      this.result = {
        message: this.formatToggleCommandResponse(toggleCommandArgs),
        status: '200'
      }
      return
    }
    this.result = {
      message: `Este comando pode ser usado da seguinte forma:\n\n*${COMMAND_PREFIX + command.command_name} on* (_permite que todos enviem mensagens no grupo_)\n*${COMMAND_PREFIX + command.command_name} off* (_somente administradores podem enviar mensagens no grupo_)`,
      status: '400'
    }
    this.logger.info('No args found or invalid args')
  }
  result: IExecutionResult = undefined;

  constructor(private readonly instance: GroupCommunicationSocket, private readonly logger: Logger) { }

  private formatToggleCommandResponse(toggleCommandArgs: any): string {
    return `Comando ${toggleCommandArgs === 'on' ? 'habilitado' : 'desabilitado'} com sucesso.`;
  }
}
