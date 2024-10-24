/**
 *
 * @param {string} userNumber Original user number to be sanitized
 * @returns {string} Sanitized user number
 */
exports.sanitizeNumber = (userNumber) => {
  return userNumber.replace(/[^0-9]/g, "").slice(0, 13);
};
