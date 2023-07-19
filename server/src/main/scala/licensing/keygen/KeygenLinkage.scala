package licensing.keygen

import io.circe.*
import io.circe.generic.semiauto.*

case class KeygenLinkageData(
    `type`: String,
    id: String
)

given Decoder[KeygenLinkageData] = deriveDecoder[KeygenLinkageData]
given Encoder[KeygenLinkageData] = deriveEncoder[KeygenLinkageData]

case class KeygenLinkage(
    data: KeygenLinkageData
)

given Decoder[KeygenLinkage] = deriveDecoder[KeygenLinkage]
given Encoder[KeygenLinkage] = deriveEncoder[KeygenLinkage]
