const { COMMAND_PREFIX } = require("./constants")
/**
 * @typedef {Object} Key
 * @property {string} remoteJid
 * @property {boolean} fromMe
 * @property {string} participant
 * @property {string} id
 * @exports Key
 */
/**
 * @typedef {Object} SenderKeyDistributionMessage
 * @property {string} groupId
 */
/**
 * @typedef {Object} Message
 * @property {string} conversation
 * @property {SenderKeyDistributionMessage|undefined} senderKeyDistributionMessage
 * @exports Message
 */
/**
 * @typedef {Object} ContextInfo
 * @property {Array} groupMentions
 * @property {Array} mentionedJid
 * @property {string} participant
 * @property {Message} quotedMessage
 */
/**
 * @typedef {Object} ExtendedTextMessage
 * @property {ContextInfo} contextInfo
 * @property {Number} inviteLinkGroupTypeV2
 * @property {Number} previewType
 * @property {String} text 
 */
/**
 * @typedef {Object} PayloadMessage
 * @property {Key} key
 * @property {Message} message
 * @property {string} participant
 * @exports PayloadMessage
 */
/**
 * @typedef {Object} ExtendedMessage
 * @property {ExtendedTextMessage} extendedTextMessage
 * @property {Object} messageContextInfo
 * @property {SenderKeyDistributionMessage|undefined}senderKeyDistributionMessage
 */
/**
 * @typedef {Object} ExtendedPayload
 * @property {Key} key
 * @property {ExtendedMessage} message
 * @exports PayloadMessage
 */
/**
 * @typedef {Object} MentionMessage
 * @property {ExtendedTextMessage}extendedTextMessage
 * @property {SenderKeyDistributionMessage} senderKeyDistributionMessage
 * @property {Object} messageContextInfo
 */
/**
 * @typedef {Object} PayloadMentionMessage
 * @property {Key} key
 * @property {MentionMessage}message
 */
/**
 * 
 * @param {PayloadMentionMessage} payload 
 */
exports.is_command_mention= (payload)=>{
  const is_command = payload.message.extendedTextMessage?.text.startsWith(COMMAND_PREFIX)
  return {command:is_command?payload.message.extendedTextMessage.text:null}
}
/**
 * 
 * @param {PayloadMessage} payload 
 */
exports.is_command = (payload) => {
  const is_command = payload.message.conversation.startsWith(COMMAND_PREFIX)
  return { command: is_command ? payload.message.conversation : null }
}
/**
 * 
 * @param {ExtendedPayload} payload 
 */
exports.is_command_extended=(payload)=>{
  const is_command = payload.message.extendedTextMessage?.text.startsWith(COMMAND_PREFIX)
  return { command: is_command ? payload.message.extendedTextMessage.text : null }
}
/**
 * @param {PayloadMessage} payload
 */
exports.get_command = (payload) => {
  const { command } = this.is_command(payload)
  if (!command || !payload.key.fromMe) return null
  const [command_name, ...args] = command.replace(COMMAND_PREFIX, '').split(' ')
  return {
    command_name,
    args,
    groupId: payload.message.senderKeyDistributionMessage?.groupId || payload.key.remoteJid,
    command_executor:payload.key.participant
  }
}
/**
 * 
 * @param {ExtendedPayload} payload 
 */
exports.get_command_extended=(payload)=>{
  const {command} = this.is_command_extended(payload)
  if (!command || !payload.key.fromMe) return null
  const command_name = command.replace(COMMAND_PREFIX,'')
  return{
    command_name,
    args:payload.message?.extendedTextMessage.contextInfo.participant,
    groupId: payload.message.senderKeyDistributionMessage?.groupId || payload.key.remoteJid,
    command_executor:payload.key.participant
  }
}

/**
 * 
 * @param {PayloadMentionMessage} payload 
 */
exports.get_command_mention = (payload)=>{
  const {command} = this.is_command_mention(payload)
  if(!command || !payload.key.fromMe) return null
  const command_name = command.replace(COMMAND_PREFIX,'')
  return{
    command_name,
    args:payload.message?.extendedTextMessage.contextInfo.mentionedJid,
    groupId: payload.message.senderKeyDistributionMessage?.groupId || payload.key.remoteJid,
    command_executor: payload.key.participant
  }

}
