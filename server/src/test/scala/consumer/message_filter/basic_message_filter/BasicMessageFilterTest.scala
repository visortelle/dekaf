package consumer.message_filter.basic_message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.commons.text.StringEscapeUtils
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.*
import consumer.message_filter.basic_message_filter.targets.*
import consumer.message_filter.basic_message_filter.operations.*
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextConfig, ConsumerSessionMessage}
import consumer.session_runner
import zio.*
import zio.test.*
import zio.test.Assertion.*

import java.io.ByteArrayOutputStream

object BasicMessageFilterTest extends ZIOSpecDefault:
    val outputStream = new ByteArrayOutputStream();

    def runTestSpec(spec: TestSpec): Boolean =
        val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = java.lang.System.out))
        val basicMessageFilter = BasicMessageFilter(
            target = spec.target,
            op = spec.op
        )
        val filter = MessageFilter(
            isEnabled = true,
            isNegated = false,
            value = basicMessageFilter
        )
        val result = sessionContext.testMessageFilter(
            filter = filter,
            messageAsJsonOmittingValue = spec.messageAsJsonOmittingValue,
            messageValueAsJson = Right(spec.messageValueAsJson)
        ).isOk

        if spec.isShouldFail then !result else result

    case class TestSpec(
        target: BasicMessageFilterTargetTrait,
        op: TestOpTrait,
        messageAsJsonOmittingValue: String = "{}",
        messageValueAsJson: String = "null",
        isShouldFail: Boolean = false
    )

    def spec = suite(s"${this.getClass.toString}")(
        /*
         ==================
         * TestOpStringEquals *
         ==================
         */
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = "hello"),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = "hello"),
                messageValueAsJson =
                    """
                      |"hello"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = "hello"),
                messageValueAsJson =
                    """
                      |"Hello"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = "hello", isCaseInsensitive = true),
                messageValueAsJson =
                    """
                      |"Hello"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = """he"llo"""),
                messageValueAsJson =
                    """
                      |"he\"llo"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = """he`llo"""),
                messageValueAsJson =
                    """
                      |"he`llo"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = """he'llo"""),
                messageValueAsJson =
                    """
                      |"he'llo"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            val str =
                """芸座八取ホロवेबजालЛорем""" ++
                    """${abc}""" ++
                    """!#$%&'()*+,-.""" ++
                    "\"" ++
                    s"${'\\'}"
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEquals(equals = str),
                messageValueAsJson =
                    s"""
                      |"${StringEscapeUtils.escapeJson(str)}"
                      |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpStringStartsWith *
        ==================
         */
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = "hello"),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = "hello"),
                messageValueAsJson =
                    """
                      |"helloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = "hello"),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = "hello", isCaseInsensitive = true),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = """he"llo"""),
                messageValueAsJson =
                    """
                      |"he\"lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = """he`llo"""),
                messageValueAsJson =
                    """
                      |"he`lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = """he'llo"""),
                messageValueAsJson =
                    """
                      |"he'lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            val str =
                """芸座八取ホロवेबजालЛорем""" ++
                    """${abc}""" ++
                    """!#$%&'()*+,-.""" ++
                    "\"" ++
                    s"${'\\'}"
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringStartsWith(startsWith = str),
                messageValueAsJson =
                    s"""
                       |"${StringEscapeUtils.escapeJson(str) + "World"}"
                       |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpStringEndsWith *
        ==================
         */
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = "hello"),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = "World"),
                messageValueAsJson =
                    """
                      |"helloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = "world"),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = "world", isCaseInsensitive = true),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = """e"lloWorld"""),
                messageValueAsJson =
                    """
                      |"he\"lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = """e`lloWorld"""),
                messageValueAsJson =
                    """
                      |"he`lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = """e'lloWorld"""),
                messageValueAsJson =
                    """
                      |"he'lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            val str =
                """${abc}""" ++
                    """!#$%&'()*+,-.""" ++
                    "\"" ++
                    s"${'\\'}" ++
                    """芸座八取ホवेबजालЛорем"""
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringEndsWith(endsWith = str),
                messageValueAsJson =
                    s"""
                       |"${StringEscapeUtils.escapeJson(str)}"
                       |""".stripMargin
            )))
        },

        /*
        ==================
         * TestOpArrayAny *
        ==================
         */
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |{}
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |[]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |["abc"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |["xyz", "abc", "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |["xyz", "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op =
                    AnyTestOp(op =
                        TestOpArrayAny(
                            op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], [1, 2, 3], [["abc"]], 4, 5, 6, null]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op =
                    AnyTestOp(op =
                        TestOpArrayAny(
                            op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], [1, 2, 3], [["abc"]], ["abc"], 4, 5, 6, null]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAny(op =
                    AnyTestOp(op =
                        TestOpArrayAny(
                            op = AnyTestOp(
                                op = TestOpArrayAny(
                                    op = AnyTestOp(
                                        op = TestOpStringEquals(equals = "abc")
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], [1, 2, 3], [["abc"]], ["abc"], 4, 5, 6, null]
                      |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpStringIncludes *
        ==================
         */
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = "hello"),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = "oWorl"),
                messageValueAsJson =
                    """
                      |"helloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = "oworl"),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = "oworl", isCaseInsensitive = true),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = """e"lloWorl"""),
                messageValueAsJson =
                    """
                      |"he\"lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = """e`lloWorl"""),
                messageValueAsJson =
                    """
                      |"he`lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = """e'lloWorl"""),
                messageValueAsJson =
                    """
                      |"he'lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            val str =
                """hello${abc}""" ++
                    """!#$%&'()*+,-.""" ++
                    "\"" ++
                    s"${'\\'}" ++
                    """芸座八取ホवेबजालЛорем"""
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringIncludes(includes = str.substring(1, str.length - 2)),
                messageValueAsJson =
                    s"""
                       |"${StringEscapeUtils.escapeJson(str)}"
                       |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpStringMatchesRegex *
        ==================
         */
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = ""),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = "^.*-xyz-$"),
                messageValueAsJson =
                    """
                      |"abc-xyz-0123"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = "^.*-xyz-\\d+$"),
                messageValueAsJson =
                    """
                      |"abc-xyz-0123"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = "^second"),
                messageValueAsJson =
                    """
                      |"first\nsecond\nthird"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = "^second", flags = "m"),
                messageValueAsJson =
                    """
                      |"first\nsecond\nthird"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = "^secOnd"),
                messageValueAsJson =
                    """
                      |"second"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpStringMatchesRegex(pattern = "^secOnd", flags = "i"),
                messageValueAsJson =
                    """
                      |"second"
                      |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpArrayAll *
        ==================
         */
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |{}
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |[]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |["abc"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |["xyz", "abc", "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))),
                messageValueAsJson =
                    """
                      |["xyz", "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(op =
                    AnyTestOp(op =
                        TestOpArrayAll(
                            op = AnyTestOp(op = TestOpStringEquals(equals = "abc"))
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], [1, 2, 3], [["abc"]], 4, 5, 6, null]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = AnyTestOp(
                                op = TestOpStringEquals(equals = "abc")
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], ["abc"], ["abc", "abc"]]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = TestOpArrayAll(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = AnyTestOp(
                                op = TestOpArrayAll(
                                    op = AnyTestOp(
                                        op = TestOpStringEquals(equals = "abc")
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], [["abc"]], [["abc"], ["abc", "abc"]]]
                      |""".stripMargin
            )))
        }
    )
