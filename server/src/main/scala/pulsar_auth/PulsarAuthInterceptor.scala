package pulsar_auth

import com.typesafe.scalalogging.Logger
import io.grpc.*
import zio.*
import scala.jdk.CollectionConverters.*

object RequestContext:
    val pulsarAuth: Context.Key[PulsarAuth] = Context.key("pulsar_auth")

class PulsarAuthInterceptor extends ServerInterceptor:
    override def interceptCall[ReqT, RespT](
        call: ServerCall[ReqT, RespT],
        metadata: Metadata,
        next: ServerCallHandler[ReqT, RespT]
    ): ServerCall.Listener[ReqT] =
        val cookieHeader = metadata.get(Metadata.Key.of("cookie", Metadata.ASCII_STRING_MARSHALLER))
        val pulsarAuthCookie = java.net.HttpCookie.parse(cookieHeader).asScala
            .find(_.getName == "pulsar_auth")
            .map(_.getValue)
        val pulsarAuth = parsePulsarAuthJson(pulsarAuthCookie).getOrElse(defaultPulsarAuth)
        val ctx = Context.current().withValue(RequestContext.pulsarAuth, pulsarAuth)
        Contexts.interceptCall(ctx, call, metadata, next)

