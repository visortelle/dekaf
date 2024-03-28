package producer.message_generator.data_generators.json_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.graalvm.polyglot.Context

case class JsJsonGenerator(
    jsCode: String
):
    def generate(polyglotContext: Context): String =
        polyglotContext.eval("js", jsCode).asString()

object JsJsonGenerator:
    def fromPb(v: pb.JsJsonGenerator): JsJsonGenerator =
        JsJsonGenerator(
            jsCode = v.jsCode
        )

    def toPb(v: JsJsonGenerator): pb.JsJsonGenerator =
        pb.JsJsonGenerator(
            jsCode = v.jsCode
        )
