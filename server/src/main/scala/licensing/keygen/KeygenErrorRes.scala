package licensing.keygen

import io.circe.*
import io.circe.generic.semiauto.*

case class KeygenErrorSource(
    pointer: Option[String]
)

given Decoder[KeygenErrorSource] = deriveDecoder[KeygenErrorSource]
given Encoder[KeygenErrorSource] = deriveEncoder[KeygenErrorSource]

case class KeygenError(
    title: Option[String],
    detail: Option[String],
    code: Option[String],
    source: Option[KeygenErrorSource]
)

given Decoder[KeygenError] = deriveDecoder[KeygenError]
given Encoder[KeygenError] = deriveEncoder[KeygenError]

case class KeygenErrorRes(
    errors: Option[List[KeygenError]]
)

given Decoder[KeygenErrorRes] = deriveDecoder[KeygenErrorRes]
given Encoder[KeygenErrorRes] = deriveEncoder[KeygenErrorRes]
