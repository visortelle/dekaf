package envoy

import zio.*
import os as os

case class EnvoyConfigParams(
    httpServerPort: Int,
    grpcServerPort: Int,
    listenPort: Int
)

def renderEnvoyConfig(config: EnvoyConfigParams): String =
    s"""
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address: { address: 0.0.0.0, port_value: ${config.listenPort} }
      filter_chains:
        - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
              stream_idle_timeout: 0s
              access_log:
                - name: envoy.access_loggers.file
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                    path: /dev/stdout
              codec_type: auto
              stat_prefix: ingress_http
              route_config:
                name: local_route
                virtual_hosts:
                  - name: pulsar_ui
                    domains: ["*"]
                    routes:
                      - match:
                          prefix: "/api/"
                        route:
                          cluster: pulsar_ui_grpc
                          prefix_rewrite: "/"
                          timeout: 0s
                          max_stream_duration:
                            grpc_timeout_header_max: 0s
                            max_stream_duration: 0s
                      - match:
                          prefix: "/"
                        route:
                          cluster: pulsar_ui_http
                          prefix_rewrite: "/"
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
                    address: 0.0.0.0
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
                    address: 0.0.0.0
                    port_value: ${config.httpServerPort}
                  """.stripMargin

def getEnvoyConfigPath(config: EnvoyConfigParams): IO[Throwable, os.Path] = for
    fileContent <- ZIO.succeed(renderEnvoyConfig(config))
    tempDirPath <- ZIO.attempt(os.temp.dir(null, "pulsocat"))
    tempFilePath <- ZIO.attempt(tempDirPath / "envoy.yaml")
    _ <- ZIO.attempt(os.write(tempFilePath, fileContent))
yield tempFilePath
