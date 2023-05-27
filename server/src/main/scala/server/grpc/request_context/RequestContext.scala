package server.grpc.request_context

import io.grpc.Context

object RequestContext:
    val pulsarAuth: Context.Key[String] = Context.key("pulsar_auth")
