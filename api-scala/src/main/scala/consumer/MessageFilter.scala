package consumer

import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import com.typesafe.scalalogging.Logger

import org.apache.pulsar.client.api.Message

type FilterLanguage = "js" | "python"

class MessageFilter():
    val logger = Logger(getClass.getName)
    val context = Context.newBuilder("js", "python").build

    def test(lang: FilterLanguage, filterCode: String, jsonValue: String): Either[String, Boolean] =
        testUsingJs(context, filterCodeExample, jsonValue)

def testUsingJs(context: Context, filterCode: String, jsonValue: String): Either[String, Boolean] =
    val evalCode =
        s"""
          | (() => {
          |     const m = {
          |       value: ${jsonValue},
          |     }
          |
          |    return (${filterCode})(m)
          | })()
          |""".stripMargin

    try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err =>
            println(s"UNABLE TO COMPILE ${err.getMessage}")
            Left(err.getMessage)
    }

val filterCodeExample =
    s"""
      | (m) => {
      |   return m.value.includes('a')
      | }
      |""".stripMargin
