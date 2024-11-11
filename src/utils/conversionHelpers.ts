/**
 *
 * @param userNumber Original user number to be sanitized
 * @returns Sanitized user number
 */
export const sanitizeNumber = (userNumber: string): string => {
  return userNumber.replace(/[^0-9]/g, "");
};

/**
 *
 * @param userNumber Original user number to be checked
 * @returns Boolean indicating if the number is from Brazil
 */
export const isBrazilianNumber = (userNumber: string): boolean => {
  const sanitizedNumber = sanitizeNumber(userNumber);
  return sanitizedNumber.startsWith("55");
};
