package consumer

import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*

type FilterLanguage = "js" | "python"

class MessageFilter():
    val logger = Logger(getClass.getName)
    val context = Context.newBuilder("js", "python").build

    def test(lang: FilterLanguage, filterCode: String, json: String): Either[String, Boolean] =
        testUsingJs(context, filterCodeExample, json)

def testUsingJs(context: Context, filterCode: String, json: String): Either[String, Boolean] =
    val evalCode =
        s"""
          | (() => {
          |     const m = {
          |       value: ${json},
          |     }
          |
          |    return (${filterCode})(m)
          | })()
          |""".stripMargin

    try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err => Left(err.getMessage)
    }

val filterCodeExample =
    s"""
      | (m) => {
      |   return m.value.includes('a')
      | }
      |""".stripMargin
