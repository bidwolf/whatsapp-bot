import { AvailableFeedback, createFeedbackSender } from "."
import { MockGroupCommunicationSocket } from "../__mocks__/MockGroupCommunicationSocket"
import { LoggerFeedback } from "./loggerFeedback"
import { WhatsappFeedback } from "./whatsappFeedback"

describe('create Feedback sender', () => {
  it('should return a logger feedback by default', () => {
    const mockSocket = new MockGroupCommunicationSocket()
    const feedback = createFeedbackSender(mockSocket, 'any-id')
    expect(feedback).toBeInstanceOf(LoggerFeedback)
    expect(feedback).not.toBeInstanceOf(WhatsappFeedback)
  })
  it('should return a logger feedback when a logger feedback type is sent', () => {
    const mockSocket = new MockGroupCommunicationSocket()
    const feedback = createFeedbackSender(mockSocket, 'any-id', AvailableFeedback.logger)
    expect(feedback).toBeInstanceOf(LoggerFeedback)
    expect(feedback).not.toBeInstanceOf(WhatsappFeedback)

  })
  it('should return a Whatsapp feedback when a logger feedback type is sent', () => {
    const mockSocket = new MockGroupCommunicationSocket()
    const feedback = createFeedbackSender(mockSocket, 'any-id', AvailableFeedback.whatsapp)
    expect(feedback).toBeInstanceOf(WhatsappFeedback)
    expect(feedback).not.toBeInstanceOf(LoggerFeedback)
  })
})
