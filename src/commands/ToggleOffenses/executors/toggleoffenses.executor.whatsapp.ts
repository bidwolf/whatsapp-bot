import { type Logger } from 'pino';
import { GroupField, ToggleExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';

export default class WhatsappExecutor extends ToggleExecutor<WhatsAppMessage> {
  constructor(logger: Logger) {
    const onEnableDescription = 'habilita ofensas no grupo'
    const onDisableDescription = 'desabilita ofensas no grupo'
    const toggleField: GroupField = 'allowOffenses'
    super(toggleField, onEnableDescription, onDisableDescription, logger)
  }
}
