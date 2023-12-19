val scala3Version = "3.3.0"
val pulsarVersion = "3.0.0"
val zioVersion = "2.0.15"
val zioConfigVersion = "3.0.7"
val circeVersion = "0.14.5"
val jacksonVersion = "2.15.2"

// Gracefully shutdown the app on Ctrl+C when running it from SBT
Global / cancelable := true
Global / fork := true

run / javaOptions ++= Seq("-Xmx8G")

packageDoc / publishArtifact := false

scalacOptions ++= Seq("-Xmax-inlines", "50") // https://github.com/softwaremill/magnolia/issues/374

run / javaOptions ++= Seq("-Xmx8G")

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
            "com.google.protobuf" % "protobuf-java" % "3.23.3",
            "com.lihaoyi" %% "os-lib" % "0.9.1",
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
            "net.datafaker" % "datafaker" % "2.0.1",
            "org.scalameta" %% "munit" % "0.7.29" % Test
        )
    )
