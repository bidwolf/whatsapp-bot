const messageStore = new Map();
import { downloadMediaMessage, WAMessage, WAMessageUpdate, WASocket } from '@whiskeysockets/baileys';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import config from '../../config/config';
import { ExtendedWAMessageUpdate } from '../class/messageTransformer';
const { ANTI_DELETE } = config;
type Message = {
	localMediaPath?: string
} & ExtendedWAMessageUpdate
type Update = Partial<WAMessage> & { deleteMessage?: any };
type UpdateMessage = Message & {
	update: Update
}
export const storeMessage = async (msg: UpdateMessage) => {
	if (!ANTI_DELETE) return;
	if (msg.key && msg.key.id) {
		if (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage) {
			try {
				const buffer = await downloadMediaMessage(msg, 'buffer', {});
				const mediaType = Object.keys(msg.message)[0].replace('Message', '');
				const fileName = `${msg.key.id}.${mediaType}`;
				const filePath = join(process.cwd(), 'temp', fileName);
				await writeFile(filePath, buffer);
				msg.localMediaPath = filePath;
			} catch (error) {
				console.error('Error downloading media:', error);
			}
		}
		messageStore.set(msg.key.id, msg);
	}
};
export const handleAntiDelete = async (conn: WASocket, updates: UpdateMessage[]) => {
	for (const update of updates) {
		if (update.key && (update.update?.deleteMessage || update.update?.message === null)) {
			const cachedMsg = messageStore.get(update.key.id);

			if (cachedMsg && cachedMsg.message) {
				const isGroup = cachedMsg.key.remoteJid.endsWith('@g.us');

				if (isGroup) {
					try {
						const msg = cachedMsg.message;
						let content = null;

						if (msg.extendedTextMessage) {
							content = {
								text: msg.extendedTextMessage.text,
								contextInfo: {
									isForwarded: true,
									forwardingScore: 999,
								},
							};
						} else if (msg.conversation) {
							content = {
								text: msg.conversation,
								contextInfo: {
									isForwarded: true,
									forwardingScore: 999,
								},
							};
						} else if (msg.imageMessage && cachedMsg.localMediaPath) {
							content = {
								image: { url: cachedMsg.localMediaPath },
								caption: msg.imageMessage.caption,
								contextInfo: {
									isForwarded: true,
									forwardingScore: 999,
								},
							};
						} else if (msg.videoMessage && cachedMsg.localMediaPath) {
							content = {
								video: { url: cachedMsg.localMediaPath },
								caption: msg.videoMessage.caption,
								contextInfo: {
									isForwarded: true,
									forwardingScore: 999,
								},
							};
						} else if (msg.audioMessage && cachedMsg.localMediaPath) {
							content = {
								audio: { url: cachedMsg.localMediaPath },
								contextInfo: {
									isForwarded: true,
									forwardingScore: 999,
								},
							};
						}

						if (content) {
							if (content.text) {
								content.text = `⚠️ *_Anti-Delete_*\n\n*_Deleted Message_*: ${content.text}`;
							} else if (content.caption) {
								content.caption = `⚠️ *_Anti-Delete_*\n\n*_Deleted Message_*: ${content.caption}`;
							}

							await conn.sendMessage(cachedMsg.key.remoteJid, content, { quoted: cachedMsg });
						}
					} catch (error) {
						console.error('Error sending deletion notification:', error);
						console.error(
							'Message structure:',
							JSON.stringify(
								{
									key: cachedMsg.key,
									messageTypes: cachedMsg.message ? Object.keys(cachedMsg.message) : [],
									content: cachedMsg.message,
								},
								null,
								2,
							),
						);
					}
				}
				messageStore.delete(update.key.id);
			}
		}
	}
};

setInterval(() => {
	const oneHour = 60 * 60 * 1000;
	const now = Date.now();
	for (const [id, msg] of messageStore.entries()) {
		if (now - msg.messageTimestamp * 1000 > oneHour) {
			messageStore.delete(id);
		}
	}
}, 60 * 60 * 1000);
