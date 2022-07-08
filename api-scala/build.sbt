val scala3Version = "3.1.3"

lazy val root = project
  .in(file("."))
  .settings(
    name := "pulsar-ui-api",
    version := "0.1.0-SNAPSHOT",
    scalaVersion := scala3Version,
    libraryDependencies ++= Seq(
      // Scala deps
      "org.scalameta" %% "munit" % "0.7.29" % Test,
      "org.typelevel" %% "cats-core" % "2.8.0",
      // Java deps
      "org.apache.pulsar" % "pulsar-client-original" % "2.10.1",
      "org.apache.pulsar" % "pulsar-client-admin-original" % "2.10.1",
      // Peer dependencies
      "org.slf4j" % "slf4j-api" % "1.7.36", // Needed by pulsar-client-original
      "org.slf4j" % "slf4j-simple" % "1.7.36", // Needed by pulsar-client-original
      "io.netty" % "netty-all" % "4.1.78.Final" // Needed by pulsar-client-original
    )
  )

// Protobuf stuff. See also /project/scalapb.sbt
libraryDependencies ++= Seq(
    "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
    "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
    "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
    "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
