package licensing.keygen

import io.circe.*
import io.circe.generic.semiauto.*

case class KeygenLicenseDataAttributes(
    name: Option[String],
    metadata: Map[String, String],
    expiry: Option[String],
    status: Option[String]
)

given Decoder[KeygenLicenseDataAttributes] = deriveDecoder[KeygenLicenseDataAttributes]
given Encoder[KeygenLicenseDataAttributes] = deriveEncoder[KeygenLicenseDataAttributes]

case class KeygenLicenseRelationships(
    product: KeygenLinkage
)

given Decoder[KeygenLicenseRelationships] = deriveDecoder[KeygenLicenseRelationships]
given Encoder[KeygenLicenseRelationships] = deriveEncoder[KeygenLicenseRelationships]

case class KeygenLicenseData(
    `type`: String,
    id: Option[String],
    attributes: KeygenLicenseDataAttributes,
    relationships: KeygenLicenseRelationships
)

given Decoder[KeygenLicenseData] = deriveDecoder[KeygenLicenseData]
given Encoder[KeygenLicenseData] = deriveEncoder[KeygenLicenseData]

case class KeygenLicense(
    data: KeygenLicenseData
):
    def isActive: Boolean = data.attributes.status.getOrElse("") == "ACTIVE"

given Decoder[KeygenLicense] = deriveDecoder[KeygenLicense]
given Encoder[KeygenLicense] = deriveEncoder[KeygenLicense]
