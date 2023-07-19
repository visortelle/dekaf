package licensing.keygen

import io.circe.*
import io.circe.generic.semiauto.*

case class KeygenMachineDataAttributes(
    fingerprint: String,
    name: String,
    metadata: Map[String, String]
)

given Decoder[KeygenMachineDataAttributes] = deriveDecoder[KeygenMachineDataAttributes]
given Encoder[KeygenMachineDataAttributes] = deriveEncoder[KeygenMachineDataAttributes]

case class KeygenMachineRelationships(
    license: KeygenLinkage
)

given Decoder[KeygenMachineRelationships] = deriveDecoder[KeygenMachineRelationships]
given Encoder[KeygenMachineRelationships] = deriveEncoder[KeygenMachineRelationships]

case class KeygenMachineData(
    `type`: "machines",
    attributes: KeygenMachineDataAttributes,
    relationships: KeygenMachineRelationships
)

given Decoder[KeygenMachineData] = deriveDecoder[KeygenMachineData]
given Encoder[KeygenMachineData] = deriveEncoder[KeygenMachineData]

case class KeygenMachine(
    data: KeygenMachineData
)

given Decoder[KeygenMachine] = deriveDecoder[KeygenMachine]
given Encoder[KeygenMachine] = deriveEncoder[KeygenMachine]
