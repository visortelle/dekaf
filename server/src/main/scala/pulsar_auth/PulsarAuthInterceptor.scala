package pulsar_auth

import com.typesafe.scalalogging.Logger
import io.grpc.*
import zio.*

object RequestContext:
    val pulsarAuth: Context.Key[String] = Context.key("pulsar_auth")

class PulsarAuthInterceptor extends ServerInterceptor:
    override def interceptCall[ReqT, RespT](
        call: ServerCall[ReqT, RespT],
        metadata: Metadata,
        next: ServerCallHandler[ReqT, RespT]
    ): ServerCall.Listener[ReqT] =
        val pulsarAuth = metadata.get(Metadata.Key.of("cookie", Metadata.ASCII_STRING_MARSHALLER))

        val ctx = Context.current().withValue(RequestContext.pulsarAuth, pulsarAuth)
        Contexts.interceptCall(ctx, call, metadata, next)

