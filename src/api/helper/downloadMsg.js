const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
/**
 *
 * @param {import('../class/messageTransformer').ExtendedWAMessageUpdate} msg
 * @param {import('@whiskeysockets/baileys').MediaType} msgType
 * @returns
 */
module.exports = async function downloadMessage(msg, msgType) {
  let buffer = Buffer.from([]);
  try {
    const { directPath, mediaKey, url } = msg.msg;
    const stream = await downloadContentFromMessage(
      { directPath, mediaKey, url },
      msgType,
    );
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
  } catch {
    return console.log("error downloading file-message");
  }
  return buffer;
};
