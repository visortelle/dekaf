package main

import _root_.config.ConfigProviderImpl
import _root_.envoy.Envoy
import _root_.server.grpc.GrpcServer
import _root_.server.http.HttpServer
import zio.*

def printStartupInfo: Task[Unit] =
    import java.time.ZoneOffset
    import java.time.temporal.ChronoField

    val Graffiti =
        """
          |########  ######## ##    ##    ###    ########
          |##     ## ##       ##   ##    ## ##   ##
          |##     ## ##       ##  ##    ##   ##  ##
          |##     ## ######   #####    ##     ## ######
          |##     ## ##       ##  ##   ######### ##
          |##     ## ##       ##   ##  ##     ## ##
          |########  ######## ##    ## ##     ## ##
          |for Apache Pulsar
          |""".stripMargin.trim.replace("$", "▓")

    for {
        _ <- ZIO.attempt {
            println(Graffiti)
            println(s"${buildinfo.BuildInfo.name} ${buildinfo.BuildInfo.version}")
            println(
                s"https://github.com/visortelle/dekaf ${java.time.Instant.ofEpochMilli(buildinfo.BuildInfo.builtAtMillis).atZone(ZoneOffset.UTC).getYear}"
            )
            println(s"Built at: ${java.time.Instant.ofEpochMilli(buildinfo.BuildInfo.builtAtMillis).toString}")
            println(s"More info: https://dekaf.io")
        }
        _ <- ZIO.logInfo(s"Started at: ${java.time.Instant.now().toString}")
    } yield ()

object Main extends ZIOAppDefault:
    def app = for {
        _ <- printStartupInfo

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

    def run = app
