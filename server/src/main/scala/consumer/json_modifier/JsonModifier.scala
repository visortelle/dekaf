package consumer.json_modifier

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class JsonModifier(
    modifier: JsJsonModifier
)

object JsonModifier:
    def fromPb(v: pb.JsonModifier): JsonModifier =
        v.modifier match
            case pb.JsonModifier.Modifier.ModifierJs(modifier) =>
                JsonModifier(
                    modifier = JsJsonModifier.fromPb(modifier)
                )
            case _ => throw new Exception("Failed to convert JsonModifier. Unknown modifier type")

    def toPb(v: JsonModifier): pb.JsonModifier =
        v.modifier match
            case modifier: JsJsonModifier =>
                pb.JsonModifier(
                    modifier = pb.JsonModifier.Modifier.ModifierJs(JsJsonModifier.toPb(modifier))
                )
