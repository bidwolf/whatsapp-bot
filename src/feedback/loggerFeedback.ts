import { Logger } from "pino"
import { IFeedbackSender } from "."

export class LoggerFeedback implements IFeedbackSender {
  private logger: Logger = require('pino')()
  async send(message: string): Promise<void> {
    this.logger.info(message)
  }
  constructor() { }
}
