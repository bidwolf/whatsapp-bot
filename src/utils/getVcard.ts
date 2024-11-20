import { sanitizeNumber } from "./conversionHelpers";
import { getWhatsAppId } from "./getWhatsappId";

export const getVcard = (vcard?: string): string => {
  if (!vcard) return ''
  const phoneNumberMatch = vcard.match(
    /TEL;(?:[^;]*;)*waid=\d+:(\+\d{2} \d{2} \d{4,5}-\d{4})/,
  );
  return phoneNumberMatch ? getWhatsAppId(sanitizeNumber(phoneNumberMatch[1])) : ''
}
