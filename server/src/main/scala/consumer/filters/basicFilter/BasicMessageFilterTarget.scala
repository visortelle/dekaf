package consumer.filters.basicFilter

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

enum BasicMessageFilterTarget:
    case Unspecified
    case Key
    case Value
    case Properties

object BasicMessageFilterTarget:
    given Decoder[BasicMessageFilterTarget] = deriveDecoder[BasicMessageFilterTarget]
    given Encoder[BasicMessageFilterTarget] = deriveEncoder[BasicMessageFilterTarget]
