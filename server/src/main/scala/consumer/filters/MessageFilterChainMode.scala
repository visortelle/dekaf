package consumer.filters

import io.circe.{Decoder, DecodingFailure, Encoder}
import io.circe.syntax.EncoderOps

enum MessageFilterChainMode:
    case All
    case Any

object MessageFilterChainMode:
    given Encoder[MessageFilterChainMode] = Encoder.instance {
        case MessageFilterChainMode.All => "All".asJson
        case MessageFilterChainMode.Any => "Any".asJson
    }

    given Decoder[MessageFilterChainMode] = Decoder.instance { cursor =>
        cursor.as[String].flatMap {
            case "All" => Right(MessageFilterChainMode.All)
            case "Any" => Right(MessageFilterChainMode.Any)

            case other => Left(DecodingFailure(s"Unknown type: $other", cursor.history))
        }
    }

