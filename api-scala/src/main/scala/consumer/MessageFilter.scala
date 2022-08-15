package consumer

import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import io.circe.syntax.*
import io.circe.generic.auto.*

type FilterLanguage = "js" | "python"

class MessageFilter():
    val logger = Logger(getClass.getName)
    val context = Context.newBuilder("js", "python").build

    def test(lang: FilterLanguage, filterCode: String, jsonMessage: JsonMessage): Either[String, Boolean] =
        lang match
            case "js" => testUsingJs(context, filterCode, jsonMessage)
            case "python" => ???

def testUsingJs(context: Context, filterCode: String, jsonMessage: JsonMessage): Either[String, Boolean] =
    val jsonMessageString = jsonMessage.asJson
    val evalCode =
        s"""
          | (() => {
          |    const msg = ${jsonMessageString}
          |
          |    return (${filterCode})(msg)
          | })()
          |""".stripMargin

    try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err => Left(s"Message filter JS error: ${err.getMessage}")
    }
