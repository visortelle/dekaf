package pulsar_auth

import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.admin.PulsarAdmin
import io.grpc.*
import zio.*
import scala.jdk.CollectionConverters.*

object RequestContext:
    val pulsarAuth: Context.Key[PulsarAuth] = Context.key("pulsar_auth")
    val pulsarAdmin: Context.Key[PulsarAdmin] = Context.key("pulsar_admin")
    val pulsarClient: Context.Key[PulsarClient] = Context.key("pulsar_client")

class PulsarAuthInterceptor extends ServerInterceptor:
    override def interceptCall[ReqT, RespT](
        call: ServerCall[ReqT, RespT],
        metadata: Metadata,
        next: ServerCallHandler[ReqT, RespT]
    ): ServerCall.Listener[ReqT] =
        val cookieHeader = metadata.get(Metadata.Key.of("cookie", Metadata.ASCII_STRING_MARSHALLER))
        val pulsarAuthCookie = java.net.HttpCookie
            .parse(cookieHeader)
            .asScala
            .find(_.getName == "pulsar_auth")
            .map(_.getValue)
        val pulsarAuth = parsePulsarAuthJson(pulsarAuthCookie).getOrElse(defaultPulsarAuth)

        var ctx = Context.current().withValue(RequestContext.pulsarAuth, pulsarAuth)

        val pulsarAdmin = makeAdminClient(pulsarAuth)
        pulsarAdmin match
            case Left(_)   => // TODO send error to the client in this case.
            case Right(pa) => ctx = ctx.withValue(RequestContext.pulsarAdmin, pa)

        val pulsarClient = makePulsarClient(pulsarAuth)
        pulsarClient match
            case Left(_)   => // TODO send error to the client in this case.
            case Right(pc) => ctx = ctx.withValue(RequestContext.pulsarClient, pc)

        Contexts.interceptCall(ctx, call, metadata, next)
