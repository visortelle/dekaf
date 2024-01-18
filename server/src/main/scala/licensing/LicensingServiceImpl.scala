package licensing

import com.tools.teal.pulsar.ui.licensing.v1.licensing.{GetLicenseInfoRequest, GetLicenseInfoResponse, LicensingServiceGrpc}
import _root_.config.readConfigAsync

import scala.concurrent.duration.{Duration, SECONDS}
import scala.concurrent.{Await, Future}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))

class LicensingServiceImpl extends LicensingServiceGrpc.LicensingService:
    override def getLicenseInfo(request: GetLicenseInfoRequest): Future[GetLicenseInfoResponse] = ???
