package consumer.message_filter.basic_message_filter

import consumer.message_filter.basic_message_filter.BasicMessageFilter
import consumer.message_filter.basic_message_filter.operations.TestOpIsNull
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextConfig}
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.io.ByteArrayOutputStream

object BasicMessageFilterTest extends ZIOSpecDefault:
    val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = new ByteArrayOutputStream()))

    def spec = suite(s"${this.getClass.toString}")(
        test("TestOpIsNull") {
            val filter = BasicMessageFilter(
                
            )
//            sessionContext.
        }
    )
