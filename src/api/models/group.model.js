const mongoose = require("mongoose");
/**
 * @typedef IGroup
 * @property {string} key - The key of the group
 * @property {string} groupId - The id of the group
 * @property {array} blockedCommands - The commands that are blocked in the group
 * @property {array} blackListedUsers - The users that are blacklisted in the group
 * @property {boolean} allowOffenses - The flag that indicates if the group allows offenses
 */
const groupSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, "key is missing"],
    unique: true,
  },
  groupId: {
    type: String,
    required: [true, "id is missing"],
    unique: true,
  },
  blockedCommands: {
    type: Array,
    default: [],
  },
  blackListedUsers: {
    type: Array,
    default: [],
  },
  allowOffenses: {
    type: Boolean,
    default: false,
  },
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
