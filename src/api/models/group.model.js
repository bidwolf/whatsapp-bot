const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
    key: {
        type: String,
        required: [true, 'key is missing'],
        unique: true,
    },
    groupId: {
        type: String,
        required: [true, 'id is missing'],
        unique: true,
    },
    blockedCommands:{
        type: Array,
    },
    blackListedUsers:{
        type: Array,
    },
})

const Group = mongoose.model('Group', groupSchema)

module.exports = Group
