const logger = require('pino')()

function handleRemoval(eventContent, groupId, user,unregisterGroup) {
  const removalEvents = Array.from(eventContent);

  removalEvents.forEach(removal => {
      const { tag, attrs: { jid } } = removal;

      if (tag === 'participant') {
          const isUser = checkIfUserRemoved(jid, user.id);
          if (isUser) {
              unregisterGroup(groupId);
              logger.info("The bot was removed or left the group, removing group from the list of available groups");
          }
      }
  });
}

function checkIfUserRemoved(jid, userId) {
  const jidWithoutDomain = String(jid).split("@")[0];
  const uidWithoutDomain = String(userId).split("@")[0].split(":")[0];
  return jidWithoutDomain === uidWithoutDomain;
}
module.exports={
  handleRemoval
}
