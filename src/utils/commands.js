const  {COMMAND_PREFIX} =require ("./constants")
/**
 * @typedef {Object} Key
 * @property {string} remoteJid
 * @property {boolean} fromMe
 * @property {string} id
 * @exports Key
 */
/**
 * @typedef {Object} senderKeyDistributionMessage
 * @property {string} groupId
 */
/**
 * @typedef {Object} Message
 * @property {string} conversation
 * @property {senderKeyDistributionMessage} senderKeyDistributionMessage
 * @exports Message
 */
/**
 * @typedef {Object} PayloadMessage
 * @property {Key} key
 * @property {Message} message
 * @property {string} participant
 * @exports PayloadMessage
 */

/**
 * 
 * @param {PayloadMessage} payload 
 */
exports.is_command = (payload)=>{
    const is_command = payload.message.conversation.startsWith(COMMAND_PREFIX)
    return {command:is_command?payload.message.conversation:null}
}

/**
 * @param {PayloadMessage} payload
 */
exports.get_command = (payload)=>{
    const {command} = this.is_command(payload)
    if(!command || !payload.key.fromMe) return null
    const [command_name,...args] = command.replace(COMMAND_PREFIX, '').split(' ')
    return {command_name,args,groupId: payload.message.senderKeyDistributionMessage?.groupId}
}
