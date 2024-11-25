import { GroupCommunicationSocket } from "../sockets"
import { WhatsappFeedback } from "./whatsappFeedback"

describe('whatsappFeedback', () => {
  it('should have a send method', async () => {
    // Arrange
    const instance: GroupCommunicationSocket = {
      sendMessage: jest.fn()
    } as unknown as GroupCommunicationSocket
    const feedbackGroupId = 'groupId'
    const feedback = new WhatsappFeedback(instance, feedbackGroupId)
    const message = 'message'
    jest.spyOn(feedback, 'send')
    // Act
    await feedback.send(message)
    // Assert
    expect(feedback.send).toHaveBeenCalledWith(message)
    expect(feedback.send).toHaveBeenCalled()
  })
})
