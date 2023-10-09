package consumer.filters.basicFilter

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

enum BasicMessageFilterOperationType:
    case Contains
    case Equals
    case GreaterThan
    case GreaterThanOrEqual
    case LessThan
    case LessThanOrEqual
    case IsTruthy
    case IsNull
    case StartsWith
    case EndsWith
    case Regex
    case Unspecified

object BasicMessageFilterOperationType:
    given Decoder[BasicMessageFilterOperationType] = deriveDecoder[BasicMessageFilterOperationType]
    given Encoder[BasicMessageFilterOperationType] = deriveEncoder[BasicMessageFilterOperationType]
