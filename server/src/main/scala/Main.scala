package main

import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import _root_.licensing.LicenseServer
import _root_.envoy.Envoy
import zio.*

object Main extends ZIOAppDefault:
    private def runApp: IO[Throwable, Unit] = for {
        grpcServerFiber <- GrpcServer.run.fork
        _ <- Envoy.run.fork
        _ <- HttpServer.run.fork
        _ <- grpcServerFiber.join
    } yield ()

    // XXX - if you changing some code here, carefully re-check that cleanup task executes on SIGINT.
    // It may doesn't show logs dev mode, therefore it's better to check using production build.
    // If you know how to fix it in dev mode, do it please. :)
    override def run: IO[Throwable, Unit] = for {
        licenseServerInitResult <- LicenseServer.init
        _ <- runApp.ensuring(licenseServerInitResult.cleanup.orElseSucceed(()))
    } yield ()
