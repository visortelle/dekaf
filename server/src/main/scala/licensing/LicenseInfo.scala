package licensing

enum Product:
    case DekafDesktopFree
    case DekafDesktop
    case DekafForTeamsFree
    case DekafForTeams
    case DekafEnterprise

case class LicenseInfo(
    product: Product,
    name: String,
    keygenProductId: String
)

object License:
    private var licenseInfo: LicenseInfo = AvailableLicenses.find(_.product == Product.DekafForTeamsFree).get

    def getLicenseInfo(): LicenseInfo = licenseInfo

    def setLicenseInfo(v: LicenseInfo) =
        licenseInfo = v

    def getProduct: Product = licenseInfo.product

val AvailableLicenses: List[LicenseInfo] = List(
    LicenseInfo(
        product = Product.DekafDesktopFree,
        name = "Dekaf Desktop Free",
        keygenProductId = "da840454-c4a1-4655-ac5d-695e7621afd7"
    ),
    LicenseInfo(
        product = Product.DekafDesktop,
        name = "Dekaf Desktop",
        keygenProductId = "5e8aa639-90a9-4bd4-863a-a19b09897b83"
    ),
    LicenseInfo(
        product = Product.DekafForTeamsFree,
        name = "Dekaf for Teams Free",
        keygenProductId = "371a9d7a-2381-4ff5-b8ef-5de8ceab7c78"
    ),
    LicenseInfo(
        product = Product.DekafForTeams,
        name = "Dekaf for Teams",
        keygenProductId = "7da73e26-c1bf-4aef-aca0-9bfb3bfc4f90"
    ),
    LicenseInfo(
        product = Product.DekafEnterprise,
        name = "Dekaf Enterprise",
        keygenProductId = "653220a5-a0d8-46ac-8a6a-ae5db2d46e8e"
    )
)
