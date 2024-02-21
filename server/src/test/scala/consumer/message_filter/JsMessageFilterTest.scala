package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.BasicMessageFilterTest.suite
import consumer.message_filter.basic_message_filter.targets.*
import consumer.json_modifier.{JsJsonModifier, JsonModifier}
import consumer.message_filter.basic_message_filter.targets.impl.BasicMessageFilterCurrentMessageValueTarget
import consumer.session_runner.{ConsumerSessionContextConfig, ConsumerSessionContextPool, ConsumerSessionMessage}
import consumer.session_runner
import zio.*
import zio.test.*
import zio.test.Assertion.*

object JsMessageFilterTest extends ZIOSpecDefault:
    case class TestSpec(
        targetField: BasicMessageFilterTargetTrait,
        targetJsonModifier: Option[JsonModifier] = None,
        jsCode: String,
        messageAsJsonOmittingValue: String = "{}",
        messageValueAsJson: String = "null",
        isShouldFail: Boolean = false
    )

    def runTestSpec(spec: TestSpec): Boolean =
        val sessionContextPool = ConsumerSessionContextPool()
        val jsMessageFilter = JsMessageFilter(jsCode = spec.jsCode)
        val filter = MessageFilter(
            isEnabled = true,
            isNegated = false,
            targetField = BasicMessageFilterTarget(
                target = spec.targetField,
                jsonModifier = spec.targetJsonModifier
            ),
            filter = jsMessageFilter
        )
        val sessionContext = sessionContextPool.getNextContext
        sessionContext.setCurrentMessage(spec.messageAsJsonOmittingValue, Right(spec.messageValueAsJson.trim))

        val result = sessionContext.testMessageFilter(filter = filter).isOk

        if spec.isShouldFail then !result else result

    def spec = suite(s"${this.getClass.toString}")(
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterCurrentMessageValueTarget(),
                jsCode = """v => v === ''""",
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterCurrentMessageValueTarget(),
                jsCode = """v => v === 'hello world'""",
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterCurrentMessageValueTarget(
                    jsonFieldSelector = Some("a")
                ),
                jsCode = """v => v === 2""",
                messageValueAsJson =
                    """
                      |{ "a": 2 }
                      |""".stripMargin
            )))
        },
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterCurrentMessageValueTarget(
                    jsonFieldSelector = Some("a")
                ),
                jsCode = """v => v === 2""",
                messageValueAsJson =
                    """
                      |{ "a": 2 }
                      |""".stripMargin
            )))
        },
        /*
        ========================
         * JsonModifier *
        ========================
         */
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterCurrentMessageValueTarget(),
                targetJsonModifier = Some(
                    JsonModifier(
                        modifier = JsJsonModifier(
                            jsCode = "v => v + 1"
                        )
                    )
                ),
                jsCode = """v => v === 3""",
                messageValueAsJson =
                    """
                      |2
                      |""".stripMargin
            )))
        },
        test(JsMessageFilter.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterCurrentMessageValueTarget(
                    jsonFieldSelector = Some("a")
                ),
                targetJsonModifier = Some(
                    JsonModifier(
                        modifier = JsJsonModifier(
                            jsCode = "v => v * v"
                        )
                    )
                ),
                jsCode = "v => v === 4",
                messageValueAsJson =
                    """
                      |{ "a": 2 }
                      |""".stripMargin
            )))
        }
    )
