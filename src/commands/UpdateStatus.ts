import pino from 'pino';
import { BaseCommand } from '../utils/commands';
import { ExtendedWAMessageUpdate, ExtendedWaSocket } from '../utils/messageTransformer';;
import ValidateExecutorAdmin from '../validators/ValidateExecutorAdmin';
import ValidateMethods from '../validators/ValidateMethods';
import ValidationRunner from '../validators/ValidationRunner';
export default class UpdateStatus extends BaseCommand {
  private extractStatusFromMessage(message: ExtendedWAMessageUpdate): string {
    const checkIfStatusIsString = message.command?.args && typeof message.command?.args === 'string';
    const checkIfStatusArgsExist = message.command?.args && typeof message.command?.args === 'object';
    const status = checkIfStatusIsString ? message.command?.args : checkIfStatusArgsExist ? message.command?.args.join(' ') : '';
    return status;
  }
  async execute(message: ExtendedWAMessageUpdate, instance: ExtendedWaSocket): Promise<void> {
    const groupMetadata = await instance.groupMetadata(message.command?.groupId || '')
    const valid = this.validator.runValidations({
      command: message.command,
      metadata: groupMetadata,
      method: message.method,
      reply: message.reply
    })
    if (!valid) {
      this.logger.info('revoke command not allowed')
      return
    }
    const status = this.extractStatusFromMessage(message);
    if (!status) {
      this.logger.info('nenhuma mensagem de status foi encontrada')
      return
    }
    instance.updateProfileStatus(status)
  }
  private readonly logger = pino()
  constructor() {
    const adminValidator = new ValidateExecutorAdmin()
    const methodValidator = new ValidateMethods(['raw'])
    super('status', new ValidationRunner([adminValidator, methodValidator]))
  }
}
