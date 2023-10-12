package main

import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import _root_.licensing.LicenseServer
import _root_.envoy.Envoy
import _root_.postgres.EmbeddedPostgres
import _root_.grafana.Grafana
import zio.*

object Main extends ZIOAppDefault:
    def run = for {
        licenseServerInitResult <- LicenseServer.init
        postgresConfig <- EmbeddedPostgres.run

        _ <- ZIO.raceFirst(
            ZIO.never,
            List(
                LicenseServer.run(licenseServerInitResult),
                Grafana.run(Grafana.RunProps(postgresConfig = postgresConfig)),
//                Envoy.run,
                HttpServer.run,
                GrpcServer.run,
            )
        )
        _ <- ZIO.never
    } yield ()
