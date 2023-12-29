package consumer.json_modifier

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class JsJsonModifier(
    jsCode: String
)

object JsJsonModifier:
    def fromPb(v: pb.JsJsonModifier): JsJsonModifier =
        JsJsonModifier(jsCode = v.jsCode)
    def toPb(v: JsJsonModifier): pb.JsJsonModifier =
        pb.JsJsonModifier(jsCode = v.jsCode)
