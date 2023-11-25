package consumer.message_filter.basic_message_filter.logic

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.*
import consumer.message_filter.basic_message_filter.logic.*
import consumer.message_filter.basic_message_filter.operations.*
import consumer.message_filter.basic_message_filter.targets.*
import consumer.session_runner
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextConfig, ConsumerSessionMessage}
import org.apache.commons.text.StringEscapeUtils
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.io.ByteArrayOutputStream

object BasicMessageFilterLogicTest extends ZIOSpecDefault:
    val outputStream = new ByteArrayOutputStream();

//    def runTestSpec(spec: TestSpec): Boolean =
//        val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = java.lang.System.out))
//        val basicMessageFilter = BasicMessageFilter(
//            target = spec.target,
//            op = spec.op
//        )
//        val filter = MessageFilter(
//            isEnabled = true,
//            isNegated = false,
//            value = basicMessageFilter
//        )
//        val result = sessionContext.testMessageFilter(
//            filter = filter,
//            messageAsJsonOmittingValue = spec.messageAsJsonOmittingValue,
//            messageValueAsJson = Right(spec.messageValueAsJson.trim)
//        ).isOk
//
//        println(sessionContext.getStdout)
//
//        if spec.isShouldFail then !result else result
//
//    case class TestSpec(
//        target: BasicMessageFilterTargetTrait,
//        op: TestOpTrait,
//        messageAsJsonOmittingValue: String = "{}",
//        messageValueAsJson: String = "null",
//        isShouldFail: Boolean = false
//    )

    def spec = suite(s"${this.getClass.toString}")(
        test(TestOpIsDefined.getClass.toString) {
            assertTrue(true)
        }
    )
