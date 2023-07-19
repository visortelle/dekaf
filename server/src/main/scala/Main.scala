package main

import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import _root_.licensing.LicenseServer
import _root_.envoy.Envoy
import zio.*

object Main extends ZIOAppDefault:
    override def run: IO[Throwable, Unit] = for {
       _ <- LicenseServer.beforeRun

       grpcServerFiber <- GrpcServer.run.fork
       _ <- LicenseServer.run.fork
       _ <- Envoy.run.fork
       _ <- HttpServer.run.fork
       _ <- grpcServerFiber.join
    } yield ()
