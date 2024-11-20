import { type GroupMetadata } from "@whiskeysockets/baileys/lib/Types/GroupMetadata";
import { IValidationResult, IValidator } from '.';
import { IMessage } from '../messages';
import { getWhatsAppId } from '../utils/getWhatsappId';
import { ERROR_MESSAGES } from '../utils/constants';
export type ParticipantPermission = 'admin' | 'superadmin' | null | undefined

abstract class ExecutorPermissionValidator<ISocketMessage extends IMessage> implements IValidator<ISocketMessage> {
  async validate(payload: ISocketMessage, metadata?: GroupMetadata): Promise<IValidationResult> {
    if (!this.permission) return { isValid: true }
    if (!payload.command || !payload.command.groupId || !payload.command.command_executor || !metadata) return { isValid: false, errorMessage: ERROR_MESSAGES.NOT_ADMIN }
    const executorWhatsappId = getWhatsAppId(payload.command.command_executor)
    const permission = metadata.participants.find(participant => participant.id === executorWhatsappId)?.admin
    if (permission && permission === this.permission) {
      return { isValid: true }
    }
    return { isValid: false, errorMessage: ERROR_MESSAGES.NOT_ADMIN }
  }
  constructor(private readonly permission: ParticipantPermission) { }
}
export default ExecutorPermissionValidator
