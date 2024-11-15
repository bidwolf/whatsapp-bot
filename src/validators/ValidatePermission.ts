import { CommandValidator, ValidateProps } from '.';
import { getWhatsAppId } from '../utils/getWhatsappId';
export type ParticipantPermission = 'admin' | 'superadmin' | null | undefined
export default abstract class ValidatePermission implements CommandValidator {
  async validate({ command, metadata }: ValidateProps): Promise<Boolean> {
    if (!this.permission) return true // Usuário não precisa de nenhum tipo de permissão
    if (!command || !command.groupId || !command.command_executor || !metadata) return false
    const executorWhatsappId = getWhatsAppId(command.command_executor)
    const isAdmin = metadata.participants.find(participant => participant.id === executorWhatsappId)?.admin
    if (isAdmin) {
      return true
    }
    return false
  }
  constructor(private readonly permission: ParticipantPermission) { }
}
