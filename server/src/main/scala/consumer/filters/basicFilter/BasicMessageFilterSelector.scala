package consumer.filters.basicFilter

import consumer.filters.basicFilter.BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.syntax.EncoderOps

sealed trait BasicMessageFilterSelector

object BasicMessageFilterSelector:
    given Decoder[BasicMessageFilterSelector] =
        Decoder.instance:
            cursor => List[Decoder[BasicMessageFilterSelector]](
                summon[Decoder[FieldSelector]].asInstanceOf[Decoder[BasicMessageFilterSelector]],
                summon[Decoder[PropertiesSelector]].asInstanceOf[Decoder[BasicMessageFilterSelector]]
            ).reduceLeft(_ or _)(cursor)

    given Encoder[BasicMessageFilterSelector] =
        Encoder.instance:
            case fieldSelector: FieldSelector => fieldSelector.asJson
            case propertiesSelector: PropertiesSelector => propertiesSelector.asJson

    case class FieldSelector(fieldSelector: String) extends BasicMessageFilterSelector
    object FieldSelector:
        given Decoder[FieldSelector] = deriveDecoder[FieldSelector]
        given Encoder[FieldSelector] = deriveEncoder[FieldSelector]

    case class PropertiesSelector(propertiesNames: Seq[String], mode: PropertiesSelectorMode) extends BasicMessageFilterSelector
    object PropertiesSelector:
        given Decoder[PropertiesSelector] = deriveDecoder[PropertiesSelector]
        given Encoder[PropertiesSelector] = deriveEncoder[PropertiesSelector]

        enum PropertiesSelectorMode:
            case All
            case Any
            case Unspecified

        object PropertiesSelectorMode:
            given Decoder[PropertiesSelectorMode] = deriveDecoder[PropertiesSelectorMode]
            given Encoder[PropertiesSelectorMode] = deriveEncoder[PropertiesSelectorMode]

            def getModeStringOperator(mode: PropertiesSelectorMode): String =
                mode match
                    case All => "&&"
                    case Any => "||"
                    case Unspecified => "&&"
