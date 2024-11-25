import { LoggerFeedback } from "./loggerFeedback"
describe('LoggerFeedback', () => {
  it('should log the message using pino logger', async () => {
    const loggerFeedback = new LoggerFeedback()
    jest.spyOn(loggerFeedback, 'send')
    const message = "Test message"

    // Chama o método send
    await loggerFeedback.send(message)

    // Verifica se o logger foi chamado corretamente
    expect(loggerFeedback.send).toHaveBeenCalledWith(message)
    expect(loggerFeedback.send).toHaveBeenCalledTimes(1)
  })
})
