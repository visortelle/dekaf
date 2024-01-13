package licensing

object Licensing:
    var licenseInfo: LicenseInfo = AvailableLicenses.find(_.productCode == ProductCode.DekafForTeamsFree).get
    def productCode: ProductCode = licenseInfo.productCode
