import { type Logger } from 'pino';
import { GroupField, ToggleExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';
export default class WhatsappExecutor extends ToggleExecutor<WhatsAppMessage> {
  constructor(logger: Logger) {
    const onEnableDescription = 'habilita o flood no grupo'
    const onDisableDescription = 'desabilita o flood no grupo'
    const toggleField: GroupField = 'spamDetection'
    super(toggleField, onEnableDescription, onDisableDescription, logger)
  }
}
