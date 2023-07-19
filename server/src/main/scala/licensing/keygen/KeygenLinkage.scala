package licensing.keygen

case class KeygenLinkageData(
    `type`: "products" | "policies" | "machines" | "licenses" | "users",
    id: String
)
case class KeygenLinkage(
    data: KeygenLinkageData
)
