package main

import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import zio.*

object Main extends ZIOApp.Proxy(GrpcServer <> HttpServer)
