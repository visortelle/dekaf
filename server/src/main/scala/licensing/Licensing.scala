package licensing

object Licensing:
    var licenseInfo: LicenseInfo = AvailableLicenses.find(_.productCode == ProductCode.DekafFree).get
    def productCode: ProductCode = licenseInfo.productCode
