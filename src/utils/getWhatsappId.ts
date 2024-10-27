export function getWhatsAppId(id: string) {
  id = id.replace(/:\d+@s\.whatsapp\.net$/, "@s.whatsapp.net");
  if (id.includes("@g.us") || id.includes("@s.whatsapp.net")) return id;
  return id.includes("-") ? `${id}@g.us` : `${id}@s.whatsapp.net`;
}
