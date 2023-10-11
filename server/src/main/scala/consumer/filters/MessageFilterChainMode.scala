package consumer.filters

import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.{Decoder, DecodingFailure, Encoder}
import io.circe.syntax.EncoderOps

enum MessageFilterChainMode:
    case All
    case Any
    case Unspecified

object MessageFilterChainMode:
    given Decoder[MessageFilterChainMode] = deriveDecoder[MessageFilterChainMode]
    given Encoder[MessageFilterChainMode] = deriveEncoder[MessageFilterChainMode]

