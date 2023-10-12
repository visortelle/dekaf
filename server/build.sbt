val scala3Version = "3.3.0"
val graalvmVersion = "22.3.1"
val pulsarVersion = "3.1.0"
val circeVersion = "0.14.5"
val zioVersion = "2.0.18"
val zioConfigVersion = "3.0.7"

maintainer := "kiryl_valkovich@teal.tools"

val javaOpts = Seq(
    "-Dpolyglot.engine.WarnInterpreterOnly=false",

    // Fix "Cannot get DNS TTL settings from sun.net.InetAddressCachePolicy"
    // https://github.com/apache/pulsar/issues/15349
    "--add-opens=java.management/sun.management=ALL-UNNAMED",
    "--add-opens=java.base/sun.net=ALL-UNNAMED"
)

scalacOptions ++= Seq(
    "-Xmax-inlines",
    "100", // https://github.com/softwaremill/magnolia/issues/374
)

// Gracefully shutdown the app on Ctrl+C when running it from SBT
Global / cancelable := true
Global / fork := true

javaOptions ++= javaOpts

Global / resolvers += Resolver.mavenLocal

// Define extra properties at build time that are available in runtime.
Compile / sourceGenerators += Def.task {
  val buildInfo = (Compile / sourceManaged).value / "ExtraBuildInfo.scala"
  IO.write(buildInfo,
    s"""package buildinfo
       |object ExtraBuildInfo {
       |  val isBinaryBuild = ${System.getProperty("isBinaryBuild") == "true"}
       |}
       |""".stripMargin)
  Seq(buildInfo)
}.taskValue

lazy val root = project
    .enablePlugins(BuildInfoPlugin)
    .enablePlugins(JavaAppPackaging)
    .enablePlugins(UniversalPlugin)
    .enablePlugins(GitVersioning)
    .in(file("."))
    .settings(
        name := "dekaf",
        scalaVersion := scala3Version,
        Compile / mainClass := Some("main.Main"),
        Universal / javaOptions ++= javaOpts,
        buildInfoPackage := "buildinfo",
        buildInfoObject := "BuildInfo",
        buildInfoOptions += BuildInfoOption.BuildTime,
        buildInfoOptions += BuildInfoOption.ToMap,
        git.useGitDescribe := true,
        Compile / packageDoc / mappings := Seq(), // https://github.com/sbt/sbt-native-packager/issues/651
        libraryDependencies ++= Seq(
            // Logging
            "ch.qos.logback" % "logback-classic" % "1.4.7",
            "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5",
            // Pulsar
            "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
            "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,
            // GraalVM
            "org.graalvm.truffle" % "truffle-api" % graalvmVersion,
            "org.graalvm.js" % "js" % graalvmVersion,

            // ZIO
            "dev.zio" %% "zio" % zioVersion,
            "dev.zio" %% "zio-test-sbt" % zioVersion % Test,
            "dev.zio" %% "zio-config" % zioConfigVersion,
            "dev.zio" %% "zio-config-typesafe" % zioConfigVersion,
            "dev.zio" %% "zio-config-magnolia" % zioConfigVersion,
            "dev.zio" %% "zio-config-yaml" % zioConfigVersion,
            "dev.zio" %% "zio-process" % "0.7.2",
            "com.softwaremill.sttp.client4" %% "zio" % "4.0.0-M2",
            "com.softwaremill.sttp.client4" %% "circe" % "4.0.0-M2",

            // Serialization
            "io.circe" %% "circe-core" % circeVersion,
            "io.circe" %% "circe-generic" % circeVersion,
            "io.circe" %% "circe-parser" % circeVersion,

            // Javalin
            "io.javalin" % "javalin" % "5.3.2",
            "io.javalin" % "javalin-rendering" % "5.3.2",
            "org.freemarker" % "freemarker" % "2.3.31",
            "javax.annotation" % "javax.annotation-api" % "1.3.2",

            // Uncategorized
            "org.apache.commons" % "commons-lang3" % "3.12.0",
            "tech.allegro.schema.json2avro" % "converter" % "0.2.15",
            "com.google.guava" % "guava" % "31.1-jre",
            "com.lihaoyi" %% "os-lib" % "0.9.1",
            "com.lihaoyi" %% "pprint" % "0.8.1", // Useful during development
            "io.netty" % "netty-all" % "4.1.93.Final",
            "com.fasterxml.uuid" % "java-uuid-generator" % "4.2.0"
        )
    )

// Protobuf stuff. See also /project/scalapb.sbt
libraryDependencies ++= Seq(
    "com.google.protobuf" % "protobuf-java" % "3.23.4",
    "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
    "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
    "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
    "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
