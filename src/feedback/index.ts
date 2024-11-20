export type IFeedbackSender = {
  send(message: string): Promise<void>
}
