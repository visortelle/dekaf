package consumer.message_filter.basic_message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.*
import consumer.message_filter.basic_message_filter.targets.*
import consumer.message_filter.basic_message_filter.operations.*
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextConfig, ConsumerSessionMessage}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.io.ByteArrayOutputStream

object BasicMessageFilterTest extends ZIOSpecDefault:
    val outputStream = new ByteArrayOutputStream();
    val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = java.lang.System.out))

    def spec = suite(s"${this.getClass.toString}")(
        test(TestOpStringEquals.getClass.toString) {
            val target = BasicMessageFilterValueTarget(jsonFieldSelector = None)
            val op = TestOpStringEquals(equals = "hello")
            val basicMessageFilter = BasicMessageFilter(
                target = target,
                op = op
            )
            val filter = MessageFilter(
                isEnabled = true,
                isNegated = false,
                value = basicMessageFilter
            )

            val messageValueAsJson =
                """
                  |"hello"
                  |""".stripMargin.trim

            val msg = ConsumerSessionMessage(
                messagePb = pb.Message(),
                messageAsJsonOmittingValue = "{}",
                messageValueAsJson = Right(messageValueAsJson)
            )

            val result = sessionContext.testMessageFilter(filter, msg.messageAsJsonOmittingValue, msg.messageValueAsJson)

            assertTrue(result.isOk)
        }
    )
