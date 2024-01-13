package licensing

enum ProductCode:
    case DekafDesktopFree
    case DekafDesktop
    case DekafForTeamsFree
    case DekafForTeams
    case DekafEnterprise

case class LicenseInfo(
    productCode: ProductCode,
    productName: String,
    keygenProductId: String
)

val AvailableLicenses: List[LicenseInfo] = List(
    LicenseInfo(
        productCode = ProductCode.DekafDesktopFree,
        productName = "Dekaf Desktop Free",
        keygenProductId = "da840454-c4a1-4655-ac5d-695e7621afd7"
    ),
    LicenseInfo(
        productCode = ProductCode.DekafDesktop,
        productName = "Dekaf Desktop",
        keygenProductId = "5e8aa639-90a9-4bd4-863a-a19b09897b83"
    ),
    LicenseInfo(
        productCode = ProductCode.DekafForTeamsFree,
        productName = "Dekaf for Teams Free",
        keygenProductId = "371a9d7a-2381-4ff5-b8ef-5de8ceab7c78"
    ),
    LicenseInfo(
        productCode = ProductCode.DekafForTeams,
        productName = "Dekaf for Teams",
        keygenProductId = "7da73e26-c1bf-4aef-aca0-9bfb3bfc4f90"
    ),
    LicenseInfo(
        productCode = ProductCode.DekafEnterprise,
        productName = "Dekaf Enterprise",
        keygenProductId = "653220a5-a0d8-46ac-8a6a-ae5db2d46e8e"
    )
)
