package licensing.keygen

case class KeygenMachineDataAttributes(
    fingerprint: String,
    name: String,
    metadata: Map[String, String]
)
case class KeygenMachineRelationships(
    license: KeygenLinkage
)
case class KeygenMachineData(
    `type`: "machines",
    attributes: KeygenMachineDataAttributes,
    relationships: KeygenMachineRelationships
)
case class KeygenMachine(
    data: KeygenMachineData
)
