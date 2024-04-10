package consumer.consumer_session.page

import com.microsoft.playwright.Locator

case class ConsumerSessionPageHtml(root: Locator):
    def startButton: ButtonHtml = ButtonHtml(root = root.getByTestId("start-consumer-session-button"))
    def pauseButton: ButtonHtml = ButtonHtml(root = root.getByTestId("pause-consumer-session-button"))
    def stopButton: ButtonHtml = ButtonHtml(root = root.getByTestId("stop-consumer-session-button"))
    def sessionTarget(i: Int): ConsumerSessionTargetHtml =
        ConsumerSessionTargetHtml(root = root.getByTestId(s"consumer-session-target-$i"))
