package main

import _root_.server.grpc.GrpcServerApp
import _root_.server.http.HttpServerApp
import zio.*

object Main extends ZIOApp.Proxy(GrpcServerApp <> HttpServerApp)