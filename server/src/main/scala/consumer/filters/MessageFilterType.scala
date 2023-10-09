package consumer.filters

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

enum MessageFilterType:
    case BasicMessageFilter
    case JsMessageFilter

object MessageFilterType:
    given Decoder[MessageFilterType] = deriveDecoder[MessageFilterType]
    given Encoder[MessageFilterType] = deriveEncoder[MessageFilterType]
