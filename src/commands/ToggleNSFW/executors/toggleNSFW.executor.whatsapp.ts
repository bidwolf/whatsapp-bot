import { type Logger } from 'pino';
import { GroupField, ToggleExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';

export default class WhatsappExecutor extends ToggleExecutor<WhatsAppMessage> {
  constructor(logger: Logger) {
    const onEnableDescription = 'Permite o envio de conteúdo impróprio no grupo';
    const onDisableDescription = 'Proíbe conteúdo impróprio no grupo';
    const toggleField: GroupField = 'allowNSFW'
    super(toggleField, onEnableDescription, onDisableDescription, logger)
  }
}
