package producer.message_generator.json_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class JsJsonGenerator(
    jsCode: String
)

object JsJsonGenerator:
    def fromPb(v: pb.JsJsonGenerator): JsJsonGenerator =
        JsJsonGenerator(
            jsCode = v.jsCode
        )

    def toPb(v: JsJsonGenerator): pb.JsJsonGenerator =
        pb.JsJsonGenerator(
            jsCode = v.jsCode
        )
