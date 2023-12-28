package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.BasicMessageFilterTest.suite
import consumer.message_filter.basic_message_filter.targets.*
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextConfig, ConsumerSessionMessage}
import consumer.session_runner
import zio.*
import zio.test.*
import zio.test.Assertion.*

object JsMessageFilterTest extends ZIOSpecDefault:
    case class TestSpec(
        targetField: BasicMessageFilterTargetTrait,
        jsCode: String,
        messageAsJsonOmittingValue: String = "{}",
        messageValueAsJson: String = "null",
        isShouldFail: Boolean = false
    )

    def runTestSpec(spec: TestSpec): Boolean =
        val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = java.lang.System.out))
        val jsMessageFilter = JsMessageFilter(jsCode = spec.jsCode)
        val filter = MessageFilter(
            isEnabled = true,
            isNegated = false,
            targetField = BasicMessageFilterTarget(target = spec.targetField),
            filter = jsMessageFilter
        )
        val result = sessionContext.testMessageFilter(
            filter = filter,
            messageAsJsonOmittingValue = spec.messageAsJsonOmittingValue,
            messageValueAsJson = Right(spec.messageValueAsJson.trim)
        ).isOk

        if spec.isShouldFail then !result else result

    def spec = suite(s"${this.getClass.toString}")(
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                jsCode = """v => v === ''""",
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                jsCode = """v => v === 'hello world'""",
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(
                    jsonFieldSelector = Some("a")
                ),
                jsCode = """v => console.log('VVV', v) || v === 2""",
                messageValueAsJson =
                    """
                      |{ a: 2 }
                      |""".stripMargin
            )))
        }
    )
