package main

import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import _root_.licensing.LicenseServer
import _root_.envoy.Envoy
import _root_.config.{ConfigProvider, ConfigProviderImpl, Config}
import main.Main.app
import zio.*

object Main extends ZIOAppDefault:
    def app = for {
        licenseServerInitResult <- LicenseServer.init

        _ <- ZIO.raceFirst(
            ZIO.never,
            List(
                LicenseServer.run(licenseServerInitResult),
                Envoy.run,
                HttpServer.run,
                GrpcServer.run
            )
        )
        _ <- ZIO.never
    } yield ()

    def run = app.provide(
        ConfigProviderImpl.layer,
    )
