package consumer

import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import com.typesafe.scalalogging.Logger

import org.apache.pulsar.client.api.Message

case class JsonMessage()

type FilterLanguage = "js" | "python"

class MessageFilter():
    val logger = Logger(getClass.getName)
    val context = Context.newBuilder("js", "python").build

    def test(lang: FilterLanguage, code: String, msg: Message[Array[Byte]]): Either[String, Boolean] =
        try {
            val value = msg.getValue()
            logger.info(s"VALUEEEEEEEEEEEEE: ${value}")
            Right(context.eval(lang, code).asBoolean)
        } catch {
            case err => Left(err.getMessage)
        }
