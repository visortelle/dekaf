package consumer.session_runner

import zio.test.*

object consumerSessionContextTest extends ZIOSpecDefault:
    private def withContext[A](use: ConsumerSessionContext => A): A =
        val pool = ConsumerSessionContextPool()
        try pool.withContext(0)(use)
        finally pool.close()

    def spec = suite(this.getClass.toString)(
        test("lastMessage is a live public view of the latest session message") {
            withContext { sessionContext =>
                val absentBeforeFirstMessage = sessionContext.context
                    .eval("js", "typeof lastMessage === 'undefined'")
                    .asBoolean()

                sessionContext.setCurrentMessage("""{"key":"first"}""", Right("""{"number":1}"""))
                val firstMessageIsVisible = sessionContext.context
                    .eval(
                        "js",
                        s"lastMessage === $CurrentMessageVarName && lastMessage.key === 'first' && lastMessage.value.number === 1"
                    )
                    .asBoolean()

                sessionContext.setCurrentMessage("""{"key":"second"}""", Right("""{"number":2}"""))
                val viewFollowedLatestMessage = sessionContext.context
                    .eval("js", "lastMessage.key === 'second' && lastMessage.value.number === 2")
                    .asBoolean()

                assertTrue(absentBeforeFirstMessage, firstMessageIsVisible, viewFollowedLatestMessage)
            }
        },
        test("setting the current message is silent but explicit console output is preserved") {
            withContext { sessionContext =>
                sessionContext.setCurrentMessage("""{"key":"quiet"}""", Right("""{"number":3}"""))
                val automaticOutput = sessionContext.getStdout

                sessionContext.runCode("""console.log("user-authored output")""")
                val userOutput = sessionContext.getStdout

                assertTrue(automaticOutput.isEmpty, userOutput.contains("[LOG] user-authored output"))
            }
        }
    )
