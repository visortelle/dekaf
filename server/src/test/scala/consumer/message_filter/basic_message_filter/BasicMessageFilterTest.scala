package consumer.message_filter.basic_message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.json_modifier.{JsJsonModifier, JsonModifier}
import org.apache.commons.text.StringEscapeUtils
import consumer.message_filter.MessageFilter
import consumer.message_filter.basic_message_filter.*
import consumer.message_filter.basic_message_filter.logic.*
import consumer.message_filter.basic_message_filter.targets.*
import consumer.message_filter.basic_message_filter.operations.*
import consumer.session_runner.{ConsumerSessionContextPool, ConsumerSessionContextConfig, ConsumerSessionMessage}
import consumer.session_runner
import zio.*
import zio.test.*
import zio.test.Assertion.*

object BasicMessageFilterTest extends ZIOSpecDefault:
    case class TestSpec(
        targetField: BasicMessageFilterTargetTrait,
        targetJsonModifier: Option[JsonModifier] = None,
        op: BasicMessageFilterOp,
        messageAsJsonOmittingValue: String = "{}",
        messageValueAsJson: String = "null",
        isShouldFail: Boolean = false
    )

    def runTestSpec(spec: TestSpec): Boolean =
        val sessionContextPool = ConsumerSessionContextPool()
        val basicMessageFilter = BasicMessageFilter(op = spec.op)
        val filter = MessageFilter(
            isEnabled = true,
            isNegated = false,
            targetField = BasicMessageFilterTarget(
                target = spec.targetField,
                jsonModifier = spec.targetJsonModifier
            ),
            filter = basicMessageFilter
        )
        val sessionContext = sessionContextPool.getNextContext
        val result = sessionContext.testMessageFilter(filter = filter).isOk

        if spec.isShouldFail then !result else result

    def spec = suite(s"${this.getClass.toString}")(
        /*
        ========================
         * BasicMessageFilter *
        ========================
         */
        test(BasicMessageFilter.getClass.toString) {
            assertTrue {
                val sessionContextPool = ConsumerSessionContextPool()
                val sessionContext = sessionContextPool.getNextContext

                val basicMessageFilter = BasicMessageFilter(
                    op = BasicMessageFilterOp(
                        op = AnyTestOp(
                            op = TestOpBoolIsTrue()
                        )
                    )
                )
                val filter = MessageFilter(
                    isEnabled = true,
                    isNegated = false,
                    targetField = BasicMessageFilterTarget(target = BasicMessageFilterValueTarget()),
                    filter = basicMessageFilter
                )

                val messageValueAsJson =
                    """
                      |true
                      |""".stripMargin

                sessionContext.testMessageFilter(filter = filter).isOk
            }
        },
        test(BasicMessageFilter.getClass.toString) {
            assertTrue {
                val sessionContextPool = ConsumerSessionContextPool()
                val sessionContext = sessionContextPool.getNextContext

                val basicMessageFilter = BasicMessageFilter(
                    op = BasicMessageFilterOp(
                        op = AnyTestOp(
                            op = TestOpBoolIsTrue()
                        )
                    )
                )
                val filter = MessageFilter(
                    isEnabled = true,
                    isNegated = true,
                    targetField = BasicMessageFilterTarget(target = BasicMessageFilterValueTarget()),
                    filter = basicMessageFilter
                )

                val messageValueAsJson =
                    """
                      |true
                      |""".stripMargin

                val isOk = sessionContext.testMessageFilter(filter = filter).isOk

                !isOk
            }
        },
        /*
        ==================
         * JsonModifier *
        ==================
         */
        test(BasicMessageFilterValueTarget.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                targetJsonModifier = Some(
                    JsonModifier(
                        modifier = JsJsonModifier(
                            jsCode = "v => v + 1"
                        )
                    )
                ),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq(eq = "3")
                    )
                ),
                messageValueAsJson =
                    """
                      |2
                      |""".stripMargin
            )))
        },
        test(BasicMessageFilterValueTarget.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(
                    jsonFieldSelector = Some("a")
                ),
                targetJsonModifier = Some(
                    JsonModifier(
                        modifier = JsJsonModifier(
                            jsCode =
                                """
                                  |v => v * v
                                  |""".stripMargin
                        )
                    )
                ),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq(eq = "4")
                    )
                ),
                messageValueAsJson =
                    """
                      |{ a: 2 }
                      |""".stripMargin
            )))
        },
        /*
        ========================
         * BasicMessageFilterOp *
        ========================
         */
        test(BasicMessageFilterOp.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    isNegated = true,
                    op = AnyTestOp(
                        op = TestOpBoolIsTrue()
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    AnyTestOp(
                        op = TestOpBoolIsTrue()
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
                targetField = BasicMessageFilterValueTarget(),
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
                targetField = BasicMessageFilterValueTarget(),
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
                targetField = BasicMessageFilterValueTarget(),
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
                targetField = BasicMessageFilterValueTarget(),
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
                targetField = BasicMessageFilterValueTarget(),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
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
                                                    testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
                op = BasicMessageFilterOp(op = AnyTestOp(op = TestOpIsDefined())),
                messageValueAsJson =
                    """
                      |{ "a": 7 }
                      |""".stripMargin
            )))
        },
        test(TestOpIsDefined.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpIsDefined()
                    )
                ),
                messageValueAsJson =
                    """
                      |{ "b": 8 }
                      |""".stripMargin
            )))
        },
        test(TestOpIsDefined.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpIsDefined()
                    )
                ),
                messageValueAsJson =
                    """
                      |{ "a": null }
                      |""".stripMargin
            )))
        },
        /*
        ==================
         * TestOpIsNull *
        ==================
         */
        test(TestOpIsNull.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpIsNull()
                    )
                ),
                messageValueAsJson =
                    """
                      |{ "a": null }
                      |""".stripMargin
            )))
        },
        test(TestOpIsNull.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(jsonFieldSelector = Some("a")),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpIsNull()
                    )
                ),
                messageValueAsJson =
                    """
                      |{ "b": null }
                      |""".stripMargin
            )))
        },
        /*
        =====================
         * TestOpBool(IsTrue|IsFalse) *
        =====================
         */
        test(TestOpBoolIsTrue.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    AnyTestOp(
                        op = TestOpBoolIsTrue()
                    )
                ),
                messageValueAsJson =
                    """
                      |true
                      |""".stripMargin
            )))
        },
        test(TestOpBoolIsTrue.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpBoolIsTrue()
                    )
                ),
                messageValueAsJson =
                    """
                      |false
                      |""".stripMargin
            )))
        },
        test(TestOpBoolIsFalse.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(op =
                    AnyTestOp(
                        op = TestOpBoolIsFalse()
                    )
                ),
                messageValueAsJson =
                    """
                      |false
                      |""".stripMargin
            )))
        },
        test(TestOpBoolIsFalse.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpBoolIsFalse()
                    )
                ),
                messageValueAsJson =
                    """
                      |true
                      |""".stripMargin
            )))
        },
        test(TestOpBoolIsFalse.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpBoolIsFalse()
                    )
                ),
                messageValueAsJson =
                    """
                      |null
                      |""".stripMargin
            )))
        },
        test(TestOpBoolIsFalse.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpBoolIsFalse()
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpBoolIsTrue.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpBoolIsTrue()
                    )
                ),
                messageValueAsJson =
                    """
                      |"abc"
                      |""".stripMargin
            )))
        },
        /*
        =====================
         * TestOpNumberEq *
        =====================
         */
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |"0"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |"1"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("9000")
                    )
                ),
                messageValueAsJson =
                    """
                      |"9000"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("9000.1")
                    )
                ),
                messageValueAsJson =
                    """
                      |"9000.1"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("218446744073709551615")
                    )
                ),
                messageValueAsJson =
                    """
                      |"218446744073709551615"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("218446744073709551615")
                    )
                ),
                messageValueAsJson =
                    """
                      |"218446744073709551610"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("2.18446744073709551615")
                    )
                ),
                messageValueAsJson =
                    """
                      |"2.18446744073709551615"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberEq.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberEq("2.18446744073709551615")
                    )
                ),
                messageValueAsJson =
                    """
                      |"2.18446744073709551610"
                      |""".stripMargin
            )))
        },
        /*
        =====================
         * TestOpNumberLt *
        =====================
         */
        test(TestOpNumberLt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberLt("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpNumberLt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberLt("3")
                    )
                ),
                messageValueAsJson =
                    """
                      |"2"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberLt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberLt("3")
                    )
                ),
                messageValueAsJson =
                    """
                      |"3"
                      |""".stripMargin
            )))
        },
        /*
        =====================
         * TestOpNumberLte *
        =====================
         */
        test(TestOpNumberLte.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberLte("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpNumberLte.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberLte("3")
                    )
                ),
                messageValueAsJson =
                    """
                      |"2"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberLt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberLte("3")
                    )
                ),
                messageValueAsJson =
                    """
                      |"3"
                      |""".stripMargin
            )))
        },
        /*
        =====================
         * TestOpNumberGt *
        =====================
         */
        test(TestOpNumberGt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberGt("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpNumberGt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberGt("2")
                    )
                ),
                messageValueAsJson =
                    """
                      |"3"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberGt.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberGt("3")
                    )
                ),
                messageValueAsJson =
                    """
                      |"3"
                      |""".stripMargin
            )))
        },
        /*
        =====================
         * TestOpNumberGte *
        =====================
         */
        test(TestOpNumberLte.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberGte("0")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpNumberGte.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberGte("2")
                    )
                ),
                messageValueAsJson =
                    """
                      |"3"
                      |""".stripMargin
            )))
        },
        test(TestOpNumberGte.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpNumberGte("3")
                    )
                ),
                messageValueAsJson =
                    """
                      |"3"
                      |""".stripMargin
            )))
        },
        /*
         ==================
         * TestOpStringEquals *
         ==================
         */
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |"hello"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |"Hello"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = "hello", isCaseInsensitive = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |"Hello"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = """he"llo""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he\"llo"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = """he`llo""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he`llo"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEquals.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = """he'llo""")
                    )
                ),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEquals(equals = str)
                    )
                ),
                messageValueAsJson =
                    s"""
                      |"${StringEscapeUtils.escapeJson(str)}"
                      |""".stripMargin
            )))
        },
        /*
        ===========================
         * TestOpStringStartsWith *
        ===========================
         */
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |"helloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = "hello", isCaseInsensitive = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = """he"llo""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he\"lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = """he`llo""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he`lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringStartsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = """he'llo""")
                    )
                ),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringStartsWith(startsWith = str)
                    )
                ),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = "World")
                    )
                ),
                messageValueAsJson =
                    """
                      |"helloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = "world")
                    )
                ),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = "world", isCaseInsensitive = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = """e"lloWorld""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he\"lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(jsonFieldSelector = None),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = """e`lloWorld""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he`lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringEndsWith.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = """e'lloWorld""")
                    )
                ),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringEndsWith(endsWith = str)
                    )
                ),
                messageValueAsJson =
                    s"""
                       |"${StringEscapeUtils.escapeJson(str)}"
                       |""".stripMargin
            )))
        },
        /*
        ========================
         * TestOpStringIncludes *
        ========================
         */
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = "hello")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = "oWorl")
                    )
                ),
                messageValueAsJson =
                    """
                      |"helloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = "oworl")
                    )
                ),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = "oworl", isCaseInsensitive = true)
                    )
                ),
                messageValueAsJson =
                    """
                      |"HelloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = """e"lloWorl""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he\"lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = """e`lloWorl""")
                    )
                ),
                messageValueAsJson =
                    """
                      |"he`lloWorld"
                      |""".stripMargin
            )))
        },
        test(TestOpStringIncludes.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = """e'lloWorl""")
                    )
                ),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringIncludes(includes = str.substring(1, str.length - 2))
                    )
                ),
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "")
                    )
                ),
                messageValueAsJson =
                    """
                      |""
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "^.*-xyz-$")
                    )
                ),
                messageValueAsJson =
                    """
                      |"abc-xyz-0123"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "^.*-xyz-\\d+$")
                    )
                ),
                messageValueAsJson =
                    """
                      |"abc-xyz-0123"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "^second")
                    )
                ),
                messageValueAsJson =
                    """
                      |"first\nsecond\nthird"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "^second", flags = "m")
                    )
                ),
                messageValueAsJson =
                    """
                      |"first\nsecond\nthird"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "^secOnd")
                    )
                ),
                messageValueAsJson =
                    """
                      |"second"
                      |""".stripMargin
            )))
        },
        test(TestOpStringMatchesRegex.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpStringMatchesRegex(pattern = "^secOnd", flags = "i")
                    )
                ),
                messageValueAsJson =
                    """
                      |"second"
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAny(
                                        testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAny(
                                        testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAny(
                                        testItemOp = BasicMessageFilterOp(
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
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            itemFieldTarget = Some(
                                BasicMessageFilterFieldTarget(
                                    jsonFieldSelector = Some("a")
                                )
                            ),
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("right")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[{ "a": "wrong" }, { "b": "wrong" }, { "a": "wrong" }]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            itemFieldTarget = Some(
                                BasicMessageFilterFieldTarget(
                                    jsonFieldSelector = Some("a")
                                )
                            ),
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("right")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[{ "a": "wrong" }, { "b": "wrong" }, { "a": "right" }]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            itemFieldTarget = Some(
                                BasicMessageFilterFieldTarget(
                                    jsonFieldSelector = Some("a")
                                )
                            ),
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("right")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[{ "a": "wrong" }, { "b": "wrong" }, { "a": "right" }]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpArrayAny(
                                        itemFieldTarget = Some(
                                            BasicMessageFilterFieldTarget(
                                                jsonFieldSelector = Some("a")
                                            )
                                        ),
                                        testItemOp = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("right")
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
                      |[
                      |  [{ "a": "wrong" }, { "b": "wrong" }],
                      |  [{ "a": "wrong" }, { "a": "wrong" }]
                      |]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAny(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpArrayAny(
                                        itemFieldTarget = Some(
                                            BasicMessageFilterFieldTarget(
                                                jsonFieldSelector = Some("a")
                                            )
                                        ),
                                        testItemOp = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("right")
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
                      |[
                      |  [{ "a": "wrong" }, { "b": "wrong" }],
                      |  [{ "a": "right" }, { "a": "wrong" }]
                      |]
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAll(
                                        testItemOp = BasicMessageFilterOp(
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
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    TestOpArrayAll(
                                        testItemOp = BasicMessageFilterOp(
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
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            itemFieldTarget = Some(
                                BasicMessageFilterFieldTarget(
                                    jsonFieldSelector = Some("a")
                                )
                            ),
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("right")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[{ "a": "wrong" }, { "b": "wrong" }, { "a": "right" }]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            itemFieldTarget = Some(
                                BasicMessageFilterFieldTarget(
                                    jsonFieldSelector = Some("a")
                                )
                            ),
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpStringEquals("right")
                                )
                            )
                        )
                    )
                ),
                messageValueAsJson =
                    """
                      |[{ "a": "right" }, { "a": "right", "b": "wrong" }, { "a": "right" }]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                isShouldFail = true,
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpArrayAll(
                                        itemFieldTarget = Some(
                                            BasicMessageFilterFieldTarget(
                                                jsonFieldSelector = Some("a")
                                            )
                                        ),
                                        testItemOp = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("right")
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
                      |[
                      |  [{ "a": "right" }, { "a": "right", "b": "wrong" }],
                      |  [{ "a": "right" }, { "a": "wrong" }]
                      |]
                      |""".stripMargin
            )))
        },
        test(TestOpArrayAny.getClass.toString) {
            assertTrue(runTestSpec(TestSpec(
                targetField = BasicMessageFilterValueTarget(),
                op = BasicMessageFilterOp(
                    op = AnyTestOp(
                        op = TestOpArrayAll(
                            testItemOp = BasicMessageFilterOp(
                                op = AnyTestOp(
                                    op = TestOpArrayAll(
                                        itemFieldTarget = Some(
                                            BasicMessageFilterFieldTarget(
                                                jsonFieldSelector = Some("a")
                                            )
                                        ),
                                        testItemOp = BasicMessageFilterOp(
                                            op = AnyTestOp(
                                                op = TestOpStringEquals("right")
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
                      |[
                      |  [{ "a": "right" }, { "a": "right", "b": "wrong" }],
                      |  [{ "a": "right" }, { "a": "right" }]
                      |]
                      |""".stripMargin
            )))
        }
    )
