export const COMMAND_PREFIX = '/'
export const ERROR_MESSAGES = {
  NOT_ADMIN: 'Você não é um administrador do grupo',
  BAN_ADMIN: 'Não é possível banir um administrador',
  NOT_FOUND: 'Este número não foi encontrado no grupo',
  NO_VCARD: 'Você deve responder a uma mensagem de contato',
  ALREADY_EXISTS: "O número já está no grupo.",
  ADD_DIRECTLY: "Não foi possível adicionar esse número diretamente ao grupo. Um convite foi enviado mas ainda pode ser recusado.",
  SELF_ADM_CHANGE: "Você não pode alterar seu próprio status de administrador.",
}
export const SUCCESS_MESSAGES = {
  BAN: 'Número banido com sucesso',
  ADD: 'Número adicionado com sucesso',
  ADM_DEMOTE: 'Administrador removido com sucesso',
  ADM_PROMOTE: 'Administrador adicionado com sucesso',
}
export const INVITE_TEMPLATE = (subject: string, groupInvite: string) => `Você foi convidado para o grupo ${subject}.\nhttps://chat.whatsapp.com/${groupInvite}`
