package pulsar_auth

import _root_.client.{adminClient, client}
import com.google.protobuf.ByteString
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth as pb
import com.tools.teal.pulsar.ui.api.v1.pulsar_auth.{GetMaskedCredentialsRequest, GetMaskedCredentialsResponse}
import com.typesafe.scalalogging.Logger
import io.circe
import io.circe.parser.decode as decodeJson

import java.util.TimerTask
import java.util.concurrent.*
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

class PulsarAuthServiceImpl extends pb.PulsarAuthServiceGrpc.PulsarAuthService:
    val logger: Logger = Logger(getClass.getName)

    override def getMaskedCredentials(request: GetMaskedCredentialsRequest): Future[GetMaskedCredentialsResponse] =
//        val cookie = Option(RequestContext.pulsarAuth.get())

        val status: Status = Status(code = Code.OK.index)
        Future.successful(GetMaskedCredentialsResponse(status = Some(status)))
