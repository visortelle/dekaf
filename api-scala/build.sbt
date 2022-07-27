val scala3Version = "3.1.3"

lazy val root = project
  .in(file("."))
  .settings(
    name := "pulsar-ui-api",
    version := "0.1.0-SNAPSHOT",
    scalaVersion := scala3Version,
    libraryDependencies ++= Seq(
      // Testing
      "org.scalameta" %% "munit" % "0.7.29" % Test,
      // FP
      "org.typelevel" %% "cats-core" % "2.8.0",
      // Logging
       "ch.qos.logback" % "logback-classic" % "1.2.10",
       "com.typesafe.scala-logging" %% "scala-logging" % "3.9.4",
      // Pulsar
      "org.apache.pulsar" % "pulsar-client-original" % "2.10.1",
      "org.apache.pulsar" % "pulsar-client-admin-original" % "2.10.1",
      "io.netty" % "netty-all" % "4.1.78.Final", // Needed by pulsar-client-original
      // Protobuf
      "com.google.protobuf" % "protobuf-java" % "3.21.3",
      // os
      "com.lihaoyi" %% "os-lib" % "0.8.1"
    )
  )

// Protobuf stuff. See also /project/scalapb.sbt
libraryDependencies ++= Seq(
    "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
    "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
    "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
    "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
