val scala3Version = "3.2.2"
val graalvmVersion = "22.3.1"
val pulsarVersion = "2.11.0"
val circeVersion = "0.14.3"
val zioVersion = "2.0.6"
val zioConfigVersion = "3.0.2"

maintainer := "kiryl_valkovich@teal.tools"

val javaOpts = Seq(
    "-Dpolyglot.engine.WarnInterpreterOnly=false",

    // Fix "Cannot get DNS TTL settings from sun.net.InetAddressCachePolicy"
    // https://github.com/apache/pulsar/issues/15349
    "--add-opens=java.management/sun.management=ALL-UNNAMED",
    "--add-opens=java.base/sun.net=ALL-UNNAMED"
)

fork := true
javaOptions ++= javaOpts

Global / resolvers += Resolver.mavenLocal

lazy val root = project
    .enablePlugins(BuildInfoPlugin)
    .enablePlugins(JavaAppPackaging)
    .enablePlugins(UniversalPlugin)
    .enablePlugins(GitVersioning)
    .in(file("."))
    .settings(
        name := "pulsar-ui",
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
            "ch.qos.logback" % "logback-classic" % "1.4.5",
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
            "dev.zio" %% "zio-process" % "0.7.1",

            // Circe
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
            "com.lihaoyi" %% "os-lib" % "0.9.0"
        )
    )

// Protobuf stuff. See also /project/scalapb.sbt
libraryDependencies ++= Seq(
    "com.google.protobuf" % "protobuf-java" % "3.21.12",
    "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
    "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
    "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
    "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
