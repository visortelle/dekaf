package main

import _root_.config.ConfigProviderImpl
import _root_.envoy.Envoy
import _root_.licensing.LicenseServer
import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import zio.*
import _root_.licensing.Licensing
import _root_.licensing.LicenseInfo
import _root_.licensing.AvailableLicenses
import _root_.config.readConfigAsync
import licensing.ProductCode.DekafForTeams

import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

// BEGIN QUICK_FIX - Failed to issue keygen.sh license
val dekafForTeamsHardcodedLicensePairs: Map[String, String] = Map.apply(
    "8a3093f8-c065-4181-9604-6fbf0bb30fc0" -> "activ-2a092733174c05d08fa949d88ba222bdv3"
)


val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val isDekafForTeams = dekafForTeamsHardcodedLicensePairs.get(config.licenseId.getOrElse("")).contains(config.licenseToken.getOrElse("42"))
// END QUICK_FIX - Failed to issue keygen.sh license

object Main extends ZIOAppDefault:
    def app = {
        // BEGIN QUICK_FIX - Failed to issue keygen.sh license
        if isDekafForTeams
        then {
            AvailableLicenses.find(_.productCode == DekafForTeams).foreach(Licensing.licenseInfo = _)

            for {
                _ <- ZIO.raceFirst(
                    ZIO.never,
                    List(
                        Envoy.run,
                        HttpServer.run,
                        GrpcServer.run
                    )
                )
                _ <- ZIO.never
            } yield ()
            // END QUICK_FIX - Failed to issue keygen.sh license
        } else {
            for {
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
        }
    }

    def run = app
