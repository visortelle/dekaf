import scala.collection.Seq

val scala3Version = "3.3.3"
val pulsarVersion = "3.2.1"
val zioVersion = "2.0.21"
val zioConfigVersion = "3.0.7"
val circeVersion = "0.14.6"
val jacksonVersion = "2.16.2"

// Gracefully shutdown the app on Ctrl+C when running it from SBT
Global / cancelable := true
Global / fork := true

run / javaOptions ++= Seq(
  // Fix "Cannot get DNS TTL settings from sun.net.InetAddressCachePolicy"
  // https://github.com/apache/pulsar/issues/15349
  "--add-opens=java.management/sun.management=ALL-UNNAMED",
  "--add-opens=java.base/sun.net=ALL-UNNAMED",
)

packageDoc / publishArtifact := false

scalacOptions ++= Seq(
    "-Xmax-inlines",
    "100" // https://github.com/softwaremill/magnolia/issues/374
)

resolvers += Resolver.mavenCentral

lazy val root = project
    .enablePlugins(ClasspathJarPlugin)
    .enablePlugins(BuildInfoPlugin)
    .enablePlugins(JavaAppPackaging)
    .enablePlugins(UniversalPlugin)
    .enablePlugins(GitVersioning)
    .in(file("."))
    .settings(
        name := "dekaf-demoapp",
        scalaVersion := scala3Version,
        Universal / packageName := "dekaf-demoapp",
        libraryDependencies ++= Seq(
            // Serialization
            "io.circe" %% "circe-core" % circeVersion,
            "io.circe" %% "circe-generic" % circeVersion,
            "io.circe" %% "circe-parser" % circeVersion,
            "com.fasterxml.jackson.core" % "jackson-core" % jacksonVersion,
            "com.fasterxml.jackson.dataformat" % "jackson-dataformat-avro" % jacksonVersion,
            "com.fasterxml.jackson.dataformat" % "jackson-dataformat-protobuf" % jacksonVersion,
            "com.fasterxml.jackson.datatype" % "jackson-datatype-jsr310" % jacksonVersion,
            "com.fasterxml.jackson.module" %% "jackson-module-scala" % jacksonVersion,
            "com.lihaoyi" %% "os-lib" % "0.9.2",
            "com.lihaoyi" %% "pprint" % "0.8.1",

            // Pulsar
            "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
            "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,

            // ZIO
            "dev.zio" %% "zio" % zioVersion,
            "dev.zio" %% "zio-config" % zioConfigVersion,
            "dev.zio" %% "zio-config-typesafe" % zioConfigVersion,
            "dev.zio" %% "zio-config-magnolia" % zioConfigVersion,
            "dev.zio" %% "zio-config-yaml" % zioConfigVersion,

            "dev.optics" %% "monocle-core" % "3.2.0",
            "net.datafaker" % "datafaker" % "2.1.0",
            "org.scalameta" %% "munit" % "0.7.29" % Test,
            "com.googlecode.concurrentlinkedhashmap" % "concurrentlinkedhashmap-lru" % "1.4.2",
            "org.scala-lang.modules" %% "scala-collection-compat" % "2.8.1",
            "ch.qos.logback" % "logback-classic" % "1.4.14",
        )
    )

libraryDependencies ++= Seq(
  "com.google.protobuf" % "protobuf-java" % "3.25.3",
  "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
  "com.thesamet.scalapb" %% "scalapb-json4s" % "0.12.1",
  "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
  "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
