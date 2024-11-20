import { type Logger } from 'pino';
import { GroupField, ToggleExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';

export default class WhatsappExecutor extends ToggleExecutor<WhatsAppMessage> {
  constructor(logger: Logger) {
    const onEnableDescription = 'habilita o bot no grupo'
    const onDisableDescription = 'desabilita o bot no grupo'
    const toggleField: GroupField = 'enabled'
    super(toggleField, onEnableDescription, onDisableDescription, logger)
  }
}
