package grafana

import zio.*
import zio.process.Command
import _root_.config.getFreePort
import _root_.persistency.useDataSubDir
import _root_.postgres.PostgresConfig

val dataDirName = "grafana"

object Grafana:
    case class GrafanaConfigProps(
        serverHttpAddr: String,
        serverHttpPort: String,
        postgresHost: String,
        postgresPort: String,
        postgresUser: String,
        postgresPassword: String,
        postgresDatabase: String,
        postgresSchema: String,
                                 )
    def renderConfig(props: GrafanaConfigProps): String = s"""
        |[server]
        |http_addr = ${props.serverHttpAddr}
        |http_port = ${props.serverHttpPort}
        |
        |[database]
        |url = postgres://${props.postgresUser}:${props.postgresPassword}@${props.postgresHost}:${props.postgresPort}/${props.postgresDatabase}?search_path=${props.postgresSchema}
        |
        |[metrics]
        |disable_total_stats = true
        |
        |[security]
        |disable_initial_admin_creation = true
        |disable_gravatar = true
        |cookie_secure = true
        |allow_embedding = true
        |strict_transport_security = true
        |angular_support_enabled = false
        |
        |[snapshots]
        |enabled = false
        |
        |[dashboards]
        |versions_to_keep = 1
        |
        |[users]
        |allow_sign_up = false
        |
        |""".stripMargin

//    private def initEmptyDataDir(dir: os.Path): Task[Unit] = for {
//        _ <- ZIO.logInfo(s"Initializing empty dir for Grafana")
////        process <- Command("initdb", "-D", dir.toString).inheritIO.run
////        _ <- process.successfulExitCode
//    } yield ()

//    def prepareDataDir(): Task[Unit] = for {
//        _ <- ZIO.logInfo("Preparing Grafana data directory")
//        dataDir <- useDataSubDir(dataDirName)
//        _ <- ZIO.logInfo(s"Using Grafana data directory: $dataDir")
//        isDataDirEmpty <- ZIO.attempt(os.list(dataDir).isEmpty)
//        _ <- initEmptyDataDir(dataDir).when(isDataDirEmpty)
//    } yield ()

    def getGrafanaConfigPath(config: GrafanaConfigProps): IO[Throwable, os.Path] = for
        fileContent <- ZIO.succeed(renderConfig(config))
        tempDirPath <- ZIO.attempt(os.temp.dir(null, "dekaf"))
        tempFilePath <- ZIO.attempt(tempDirPath / "grafana.ini")
        _ <- ZIO.attempt(os.write(tempFilePath, fileContent))
    yield tempFilePath

    case class RunProps(postgresConfig: PostgresConfig)
    def run(props: RunProps): Task[Unit] = for {
//        _ <- prepareDataDir()
        freePort <- ZIO.attempt(getFreePort)
//        dataDir <- useDataSubDir(dataDirName)
        grafanaConfigProps <- ZIO.succeed(GrafanaConfigProps(
            serverHttpAddr = "0.0.0.0",
            serverHttpPort = freePort.toString,
            postgresHost = props.postgresConfig.host,
            postgresPort = props.postgresConfig.port.toString,
            postgresUser = props.postgresConfig.user,
            postgresPassword = props.postgresConfig.password,
            postgresDatabase = props.postgresConfig.database,
            postgresSchema = "grafana"
        ))
        grafanaBinPath <- Command("which", "grafana").string
        grafanaHomePath <- ZIO.attempt(os.Path(grafanaBinPath + "../../../share/grafana").toString)
        _ <- ZIO.logInfo(s"Using Grafana home directory: $grafanaHomePath")

        configPath <- getGrafanaConfigPath(grafanaConfigProps).map(_.toString)

        _ <- ZIO.logInfo(s"Starting Grafana on port $freePort")
        process <- Command("grafana", "server", "--config", configPath, "--homepath", grafanaHomePath).inheritIO.run
        _ <- process.successfulExitCode
        _ <- ZIO.never
    } yield ()
