package consumer

import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*

type FilterLanguage = "js" | "python"

class MessageFilter():
    val logger = Logger(getClass.getName)
    val context = Context.newBuilder("js", "python").build

    def test(lang: FilterLanguage, filterCode: String, json: String): Either[String, Boolean] =
        testUsingJs(context, filterCode, json)

def testUsingJs(context: Context, filterCode: String, json: String): Either[String, Boolean] =
    val evalCode =
        s"""
          | (() => {
          |     const msg = {
          |       v: ${json},
          |     }
          |
          |    return (${filterCode})(msg)
          | })()
          |""".stripMargin

    try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err => Left(err.getMessage)
    }
