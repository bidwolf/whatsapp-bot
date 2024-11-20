import { type Logger } from 'pino';
import { GroupField, ToggleExecutor } from '../..';
import { WhatsAppMessage } from '../../../messages/WhatsappMessage';

export default class WhatsappExecutor extends ToggleExecutor<WhatsAppMessage> {
  constructor(logger: Logger) {
    const onEnableDescription = 'habilita os convites externos';
    const onDisableDescription = 'desabilita os convites externos';
    const toggleField: GroupField = 'shareInviteEnabled'
    super(toggleField, onEnableDescription, onDisableDescription, logger)
  }
}
