const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  remoteJid: { type: String, required: true },
  fromMe: { type: Boolean, required: true },
  id: { type: String, required: true },
  participant: { type: String, required: true },
  message: { type: String, required: false },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
