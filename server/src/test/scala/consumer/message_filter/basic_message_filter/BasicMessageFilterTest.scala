package consumer.message_filter.basic_message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.commons.text.StringEscapeUtils
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.*
import consumer.message_filter.basic_message_filter.logic.*
import consumer.message_filter.basic_message_filter.targets.*
import consumer.message_filter.basic_message_filter.operations.*
import consumer.session_runner.{ConsumerSessionContext, ConsumerSessionContextConfig, ConsumerSessionMessage}
import consumer.session_runner
import zio.*
import zio.test.*
import zio.test.Assertion.*

object BasicMessageFilterTest extends ZIOSpecDefault:
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
            messageValueAsJson = Right(spec.messageValueAsJson.trim)
        ).isOk

        if spec.isShouldFail then !result else result

    case class TestSpec(
        target: BasicMessageFilterTargetTrait,
        op: BasicMessageFilterOp,
        messageAsJsonOmittingValue: String = "{}",
        messageValueAsJson: String = "null",
        isShouldFail: Boolean = false
    )

    def spec = suite(s"${this.getClass.toString}")(
        /*
        ========================
         * BasicMessageFilter *
        ========================
         */
        test(BasicMessageFilter.getClass.toString) {
            assertTrue {
                val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = java.lang.System.out))
                val basicMessageFilter = BasicMessageFilter(
                    target = BasicMessageFilterValueTarget(),
                    op = BasicMessageFilterOp(
                        op = AnyTestOp(
                            op = TestOpBoolEquals(equals = true)
                        )
                    )
                )
                val filter = MessageFilter(
                    isEnabled = true,
                    isNegated = false,
                    value = basicMessageFilter
                )

                val messageValueAsJson =
                    """
                      |true
                      |""".stripMargin

                sessionContext.testMessageFilter(
                    filter = filter,
                    messageAsJsonOmittingValue = "{}",
                    messageValueAsJson = Right(messageValueAsJson)
                ).isOk
            }
        },
        test(BasicMessageFilter.getClass.toString) {
            assertTrue {
                val sessionContext: ConsumerSessionContext = ConsumerSessionContext(ConsumerSessionContextConfig(stdout = java.lang.System.out))
                val basicMessageFilter = BasicMessageFilter(
                    target = BasicMessageFilterValueTarget(),
                    op = BasicMessageFilterOp(
                        op = AnyTestOp(
                            op = TestOpBoolEquals(equals = true)
                        )
                    )
                )
                val filter = MessageFilter(
                    isEnabled = true,
                    isNegated = true,
                    value = basicMessageFilter
                )

                val messageValueAsJson =
                    """
                      |true
                      |""".stripMargin

                val isOk = sessionContext.testMessageFilter(
                    filter = filter,
                    messageAsJsonOmittingValue = "{}",
                    messageValueAsJson = Right(messageValueAsJson)
                ).isOk

                !isOk
            }
        },
        /*
        ========================
         * BasicMessageFilterOp *
        ========================
         */
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    isNegated = true,
                    op = AnyTestOp(
                        op = TestOpBoolEquals(equals = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |true
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    AnyTestOp(
                        op = TestOpBoolEquals(equals = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |true
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    BasicMessageFilterBraces(
                        mode = BasicMessageFilterBracesMode.All,
                        ops = Vector(
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringStartsWith("hello")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringIncludes("WRONG")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEndsWith("world")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    isNegated = true,
                    op = BasicMessageFilterBraces(
                        mode = BasicMessageFilterBracesMode.All,
                        ops = Vector(
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringStartsWith("hello")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringIncludes("WRONG")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEndsWith("world")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    BasicMessageFilterBraces(
                        mode = BasicMessageFilterBracesMode.All,
                        ops = Vector(
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringStartsWith("hello")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringIncludes("ello w")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEndsWith("world")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    isNegated = true,
                    op = BasicMessageFilterBraces(
                        mode = BasicMessageFilterBracesMode.Any,
                        ops = Vector(
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringStartsWith("hello")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringIncludes("WRONG")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEndsWith("42")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    BasicMessageFilterBraces(
                        mode = BasicMessageFilterBracesMode.Any,
                        ops = Vector(
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringStartsWith("hello")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringIncludes("WRONG")
                                )
                            ),
                            BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEndsWith("42")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |"hello world"
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = BasicMessageFilterBraces(
                                    mode = BasicMessageFilterBracesMode.Any,
                                    ops = Vector(
                                        BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals(equals = "i-am-not-an-array")
                                            )
                                        ),
                                        BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpArrayAny(
                                                    op = BasicMessageFilterOp(
                                                        op = AnyTestOp(
                                                            op = TestOpStringIncludes(includes = "abc")
                                                        )
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["i-am-not-an-array", ["abc"], ["abcWWW", "ha-ha"], ["DDDxyz", "FFabcTT", "ho-ho"]]
                      |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpIsDefined *
        ==================
         */
        test(TestOpIsDefined.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
                op = BasicMessageFilterOp(op = AnyTestOp(op = TestOpIsDefined())),
                messageValueAsJson =
                    """
                      |{ "a": 7 }
                      |""".stripMargin
            )))
        },
//        test(TestOpIsDefined.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
//                op = TestOpIsDefined(),
//                messageValueAsJson =
//                    """
//                      |{ "b": 8 }
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpIsDefined.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
//                op = TestOpIsDefined(),
//                messageValueAsJson =
//                    """
//                      |{ "a": null }
//                      |""".stripMargin
//            )))
//        },
        /*
        ==================
         * TestOpIsNull *
        ==================
         */
//        test(TestOpIsNull.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
//                op = TestOpIsNull(),
//                messageValueAsJson =
//                    """
//                      |{ "a": null }
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpIsNull.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
//                op = TestOpIsNull(),
//                messageValueAsJson =
//                    """
//                      |{ "b": null }
//                      |""".stripMargin
//            )))
//        },
        /*
        =====================
         * TestOpBoolEquals *
        =====================
         */
        test(TestOpBoolEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    AnyTestOp(
                        op = TestOpBoolEquals(equals = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |true
                      |""".stripMargin
            )))
        },
//        test(TestOpBoolEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpBoolEquals(true),
//                messageValueAsJson =
//                    """
//                      |false
//                      |""".stripMargin
//            )))
//        },
        /*
         ==================
         * TestOpStringEquals *
         ==================
         */
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = "hello"),
//                messageValueAsJson =
//                    """
//                      |""
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = "hello"),
//                messageValueAsJson =
//                    """
//                      |"hello"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = "hello"),
//                messageValueAsJson =
//                    """
//                      |"Hello"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = "hello", isCaseInsensitive = true),
//                messageValueAsJson =
//                    """
//                      |"Hello"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = """he"llo"""),
//                messageValueAsJson =
//                    """
//                      |"he\"llo"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = """he`llo"""),
//                messageValueAsJson =
//                    """
//                      |"he`llo"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = """he'llo"""),
//                messageValueAsJson =
//                    """
//                      |"he'llo"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEquals.getClass.toString) {
//            val str =
//                """芸座八取ホロवेबजालЛорем""" ++
//                    """${abc}""" ++
//                    """!#$%&'()*+,-.""" ++
//                    "\"" ++
//                    s"${'\\'}"
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEquals(equals = str),
//                messageValueAsJson =
//                    s"""
//                      |"${StringEscapeUtils.escapeJson(str)}"
//                      |""".stripMargin
//            )))
//        },
        /*
        ===========================
         * TestOpStringStartsWith *
        ===========================
         */
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = "hello"),
//                messageValueAsJson =
//                    """
//                      |""
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = "hello"),
//                messageValueAsJson =
//                    """
//                      |"helloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = "hello"),
//                messageValueAsJson =
//                    """
//                      |"HelloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = "hello", isCaseInsensitive = true),
//                messageValueAsJson =
//                    """
//                      |"HelloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = """he"llo"""),
//                messageValueAsJson =
//                    """
//                      |"he\"lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = """he`llo"""),
//                messageValueAsJson =
//                    """
//                      |"he`lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = """he'llo"""),
//                messageValueAsJson =
//                    """
//                      |"he'lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringStartsWith.getClass.toString) {
//            val str =
//                """芸座八取ホロवेबजालЛорем""" ++
//                    """${abc}""" ++
//                    """!#$%&'()*+,-.""" ++
//                    "\"" ++
//                    s"${'\\'}"
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringStartsWith(startsWith = str),
//                messageValueAsJson =
//                    s"""
//                       |"${StringEscapeUtils.escapeJson(str) + "World"}"
//                       |""".stripMargin
//            )))
//        },
        /*
        ==================
         * TestOpStringEndsWith *
        ==================
         */
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = "hello"),
//                messageValueAsJson =
//                    """
//                      |""
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = "World"),
//                messageValueAsJson =
//                    """
//                      |"helloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = "world"),
//                messageValueAsJson =
//                    """
//                      |"HelloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = "world", isCaseInsensitive = true),
//                messageValueAsJson =
//                    """
//                      |"HelloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = """e"lloWorld"""),
//                messageValueAsJson =
//                    """
//                      |"he\"lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(jsonFieldSelector = None),
//                op = TestOpStringEndsWith(endsWith = """e`lloWorld"""),
//                messageValueAsJson =
//                    """
//                      |"he`lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = """e'lloWorld"""),
//                messageValueAsJson =
//                    """
//                      |"he'lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringEndsWith.getClass.toString) {
//            val str =
//                """${abc}""" ++
//                    """!#$%&'()*+,-.""" ++
//                    "\"" ++
//                    s"${'\\'}" ++
//                    """芸座八取ホवेबजालЛорем"""
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringEndsWith(endsWith = str),
//                messageValueAsJson =
//                    s"""
//                       |"${StringEscapeUtils.escapeJson(str)}"
//                       |""".stripMargin
//            )))
//        },
        /*
        ========================
         * TestOpStringIncludes *
        ========================
         */
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = "hello"),
//                messageValueAsJson =
//                    """
//                      |""
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = "oWorl"),
//                messageValueAsJson =
//                    """
//                      |"helloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = "oworl"),
//                messageValueAsJson =
//                    """
//                      |"HelloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = "oworl", isCaseInsensitive = true),
//                messageValueAsJson =
//                    """
//                      |"HelloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = """e"lloWorl"""),
//                messageValueAsJson =
//                    """
//                      |"he\"lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = """e`lloWorl"""),
//                messageValueAsJson =
//                    """
//                      |"he`lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = """e'lloWorl"""),
//                messageValueAsJson =
//                    """
//                      |"he'lloWorld"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringIncludes.getClass.toString) {
//            val str =
//                """hello${abc}""" ++
//                    """!#$%&'()*+,-.""" ++
//                    "\"" ++
//                    s"${'\\'}" ++
//                    """芸座八取ホवेबजालЛорем"""
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringIncludes(includes = str.substring(1, str.length - 2)),
//                messageValueAsJson =
//                    s"""
//                       |"${StringEscapeUtils.escapeJson(str)}"
//                       |""".stripMargin
//            )))
//        },
        /*
        ==================
         * TestOpStringMatchesRegex *
        ==================
         */
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = ""),
//                messageValueAsJson =
//                    """
//                      |""
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = "^.*-xyz-$"),
//                messageValueAsJson =
//                    """
//                      |"abc-xyz-0123"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = "^.*-xyz-\\d+$"),
//                messageValueAsJson =
//                    """
//                      |"abc-xyz-0123"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = "^second"),
//                messageValueAsJson =
//                    """
//                      |"first\nsecond\nthird"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = "^second", flags = "m"),
//                messageValueAsJson =
//                    """
//                      |"first\nsecond\nthird"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                isShouldFail = true,
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = "^secOnd"),
//                messageValueAsJson =
//                    """
//                      |"second"
//                      |""".stripMargin
//            )))
//        },
//        test(TestOpStringMatchesRegex.getClass.toString) {
//            assertTrue(runTestSpec(TestSpec(
//                target = BasicMessageFilterValueTarget(),
//                op = TestOpStringMatchesRegex(pattern = "^secOnd", flags = "i"),
//                messageValueAsJson =
//                    """
//                      |"second"
//                      |""".stripMargin
//            )))
//        },
        /*
        ==================
         * TestOpArrayAny *
        ==================
         */
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals(equals = "abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |{}
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals(equals = "abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals(equals = "abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["abc"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["xyz", "abc", "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAny(
                                        op = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("123")
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["xyz", ["abc", "456"], "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAny(
                                        op = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("123")
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["xyz", ["abc", "123"], "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAny(
                                        op = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("123")
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["xyz", [false, null, "abc", "123"], "hello", null, false]
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
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals(equals = "abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |{}
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals(equals = "abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals(equals = "abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["abc"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["xyz", "abc", "hello"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("abc")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |["abc", "abc", "abc"]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAll(
                                        op = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("abc")
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], ["WRONG", "abc"], ["abc", "abc", "abc"]]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAll.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                target = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            op = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAll(
                                        op = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("abc")
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[[], ["abc", "abc"], ["abc", "abc", "abc"]]
                      |""".stripMargin
            )))
        }
    )
