package main

import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import _root_.envoy.Envoy
import zio.*

//object Main extends ZIOApp.Proxy(GrpcServer <> HttpServer <> Envoy)
object Main extends ZIOApp.Proxy(Envoy)
