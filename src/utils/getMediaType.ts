import { MediaType } from "@whiskeysockets/baileys"

export const getMediaType = (mtype: string): MediaType => {
  switch (mtype) {
    case 'imageMessage':
      return "image"
    case 'stickerMessage':
      return 'sticker'
    case 'videoMessage':
      return 'video'
    case 'audioMessage':
      return 'audio'
    default:
      return 'document'
  }
}
