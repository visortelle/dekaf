package server.grpc

import zio.*
import _root_.server.grpc.request_context.RequestContext
import io.grpc.{Context, Contexts, Metadata, ServerCall, ServerCallHandler, ServerInterceptor, Status}
import com.typesafe.scalalogging.Logger

class PulsarAuthInterceptor extends ServerInterceptor:
    override def interceptCall[ReqT, RespT](
        call: ServerCall[ReqT, RespT],
        metadata: Metadata,
        next: ServerCallHandler[ReqT, RespT]
    ): ServerCall.Listener[ReqT] =
        val pulsarAuth = metadata.get(Metadata.Key.of("pulsar_auth", Metadata.ASCII_STRING_MARSHALLER))

        val ctx = Context.current().withValue(RequestContext.pulsarAuth, pulsarAuth)
        Contexts.interceptCall(ctx, call, metadata, next)
