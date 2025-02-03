package envoy

import zio.*
import java.nio.file.Paths

case class EnvoyConfigProps(
    httpServerPort: Int,
    grpcServerPort: Int,
    bindAddress: String,
    listenPort: Int,
    basePath: String,
    protocol: String,
    certificateChainFilename: Option[String],
    privateKeyFilename: Option[String]
)

def renderEnvoyConfig(config: EnvoyConfigProps): String =
    val isDesktopBuild = buildinfo.ExtraBuildInfo.isDesktopBuild
    val address = config.bindAddress

    s"""
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: "${address}"
          port_value: ${config.listenPort}
      filter_chains:
        - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stream_idle_timeout: 0s
              access_log:
                - name: envoy.access_loggers.file
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
              codec_type: auto
              stat_prefix: ingress_http
              route_config:
                name: local_route
                virtual_hosts:
                  - name: pulsar_ui
                    domains: ["*"]
                    routes:
                      - match:
                          prefix: "${config.basePath}/api"
                        route:
                          cluster: pulsar_ui_grpc
                          regex_rewrite:
                            pattern:
                              google_re2: {}
                              regex: "^${config.basePath}/api/?(.*)"
                            substitution: "/\\\\1"
                          timeout: 0s
                          max_stream_duration:
                            grpc_timeout_header_max: 0s
                            max_stream_duration: 0s
                      - match:
                          prefix: "${config.basePath}"
                        route:
                          cluster: pulsar_ui_http
                          regex_rewrite:
                            pattern:
                              google_re2: {}
                              regex: "^${config.basePath}/?(.*)"
                            substitution: "/\\\\1"
                          timeout: 0s
                    cors:
                      allow_origin_string_match:
                        - prefix: "*"
                      allow_methods: GET, PUT, DELETE, POST, OPTIONS
                      allow_headers: keep-alive,user-agent,cache-control,content-type,content-transfer-encoding,x-accept-content-transfer-encoding,x-accept-response-streaming,x-user-agent,x-grpc-web,grpc-timeout
                      max_age: "1728000"
              http_filters:
                - name: envoy.filters.http.grpc_web
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
                - name: envoy.filters.http.cors
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
                - name: envoy.filters.http.router
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
          ${genTlsConfig(config).indent(10)}
  clusters:
    - name: pulsar_ui_grpc
      connect_timeout: 0.25s
      type: logical_dns
      http2_protocol_options: {}
      lb_policy: round_robin
      load_assignment:
        cluster_name: cluster_0
        endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: "${address}"
                    port_value: ${config.grpcServerPort}
    - name: pulsar_ui_http
      connect_timeout: 0.25s
      type: logical_dns
      lb_policy: round_robin
      load_assignment:
        cluster_name: cluster_0
        endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: "${address}"
                    port_value: ${config.httpServerPort}
                  """.stripMargin


def genTlsConfig(config: EnvoyConfigProps): String =
    config.protocol match
        case "https" =>
            s"""
            |transport_socket:
            |  name: envoy.transport_sockets.tls
            |  typed_config:
            |    "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
            |    common_tls_context:
            |      tls_certificates:
            |        - certificate_chain:
            |            filename: ${Paths.get(config.certificateChainFilename.get).toAbsolutePath.normalize.toString}
            |          private_key:
            |            filename: ${Paths.get(config.privateKeyFilename.get).toAbsolutePath.normalize.toString}
            |""".stripMargin
        case _ => ""

def getEnvoyConfigPath(config: EnvoyConfigProps): IO[Throwable, os.Path] = for
    fileContent <- ZIO.succeed(renderEnvoyConfig(config))
    tempDirPath <- ZIO.attempt(os.temp.dir(null, "dekaf"))
    tempFilePath <- ZIO.attempt(tempDirPath / "envoy.yaml")
    _ <- ZIO.attempt(os.write(tempFilePath, fileContent))
yield tempFilePath
