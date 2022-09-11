val scala3Version = "3.2.0"

lazy val root = project
    .enablePlugins(JavaAppPackaging)
    .enablePlugins(DockerPlugin)
    .in(file("."))
    .settings(
      name := "pulsar-ui-api",
      version := "0.1.0-SNAPSHOT",
      scalaVersion := scala3Version,
      Compile / mainClass := Some("main.Main"),
      dockerExposedPorts ++= Seq(8090),
      libraryDependencies ++= Seq(
        // Testing
        "org.scalameta" %% "munit" % "0.7.29" % Test,
        // FP
        "org.typelevel" %% "cats-core" % "2.8.0",
        // Logging
        "ch.qos.logback" % "logback-classic" % "1.2.11",
        "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5",
        // Pulsar
        "org.apache.pulsar" % "pulsar-client-original" % "2.10.1",
        "org.apache.pulsar" % "pulsar-client-admin-original" % "2.10.1",
        "io.netty" % "netty-all" % "4.1.79.Final", // Needed by pulsar-client-original

        // Uncategorized
        "com.google.protobuf" % "protobuf-java" % "3.21.5",
        "tech.allegro.schema.json2avro" % "converter" % "0.2.15",
        "com.google.guava" % "guava" % "31.1-jre",
        "com.lihaoyi" %% "os-lib" % "0.8.1",
        "io.circe" %% "circe-core" % "0.14.2",
        "io.circe" %% "circe-generic" % "0.14.2",
        "io.circe" %% "circe-parser" % "0.14.2"
      )
    )

// Protobuf stuff. See also /project/scalapb.sbt
libraryDependencies ++= Seq(
  "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
  "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
  "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
