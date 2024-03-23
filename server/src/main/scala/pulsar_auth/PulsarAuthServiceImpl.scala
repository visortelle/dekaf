package pulsar_auth

import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth as pb
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth.{GetCurrentCredentialsRequest, GetCurrentCredentialsResponse, GetMaskedCredentialsRequest, GetMaskedCredentialsResponse}
import com.typesafe.scalalogging.Logger
import io.circe

import scala.concurrent.Future

class PulsarAuthServiceImpl extends pb.PulsarAuthServiceGrpc.PulsarAuthService:
    val logger: Logger = Logger(getClass.getName)

    override def getMaskedCredentials(request: GetMaskedCredentialsRequest): Future[GetMaskedCredentialsResponse] =
        val pulsarAuth = RequestContext.pulsarAuth.get()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(
            GetMaskedCredentialsResponse(
                status = Some(status),
                credentials = pulsarAuth.credentials
                    .map(c =>
                        pb.MaskedCredentials(
                            name = c._1,
                            `type` = credentialsTypePbFromCredentials(c._2)
                        )
                    )
                    .toSeq
            )
        )

    override def getCurrentCredentials(request: GetCurrentCredentialsRequest): Future[GetCurrentCredentialsResponse] =
        val pulsarAuth = RequestContext.pulsarAuth.get()
        
        val status: Status = Status(code = Code.OK.index)
        Future.successful(
            GetCurrentCredentialsResponse(
                status = Some(status),
                name = pulsarAuth.current
            )
        )
