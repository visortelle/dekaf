package consumer.consumer_session.page

import com.microsoft.playwright.Page

case class ConsumerSessionPageHtml(root: Page):
    def startButton: ButtonHtml = ButtonHtml(root = root.getByTestId("start-consumer-session-button"))
    def pauseButton: ButtonHtml = ButtonHtml(root = root.getByTestId("pause-consumer-session-button"))
    def stopButton: ButtonHtml = ButtonHtml(root = root.getByTestId("stop-consumer-session-button"))
    def messagesProcessed: Long = root.getByTestId("messages-processed").textContent().replaceAll(",", "").toLong
    def sessionTarget(i: Int): ConsumerSessionTargetHtml =
        ConsumerSessionTargetHtml(root = root.getByTestId(s"consumer-session-target-$i"))
