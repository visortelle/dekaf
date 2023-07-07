val scala3Version = "3.3.0"
val pulsarVersion = "3.0.0"
val zioVersion = "2.0.15"
val circeVersion = "0.14.5"
val jacksonVersion = "2.15.2"

lazy val root = project
    .in(file("."))
    .settings(
        name := "pulsocat-demo-app",
        version := "0.1.0-SNAPSHOT",
        scalaVersion := scala3Version,
        libraryDependencies ++= Seq(
            // Serialization
            "io.circe" %% "circe-core" % circeVersion,
            "io.circe" %% "circe-generic" % circeVersion,
            "io.circe" %% "circe-parser" % circeVersion,
            "com.fasterxml.jackson.core" % "jackson-core" % jacksonVersion,
            "com.fasterxml.jackson.dataformat" % "jackson-dataformat-avro" % jacksonVersion,
            "com.fasterxml.jackson.dataformat" % "jackson-dataformat-protobuf" % jacksonVersion,
            "com.google.protobuf" % "protobuf-java" % "3.23.3",
            "com.lihaoyi" %% "os-lib" % "0.9.1",
            "com.lihaoyi" %% "pprint" % "0.8.1",

            // Pulsar
            "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
            "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,

            // ZIO
            "dev.zio" %% "zio" % zioVersion,

            // Lenses
            "dev.optics" %% "monocle-core" % "3.2.0",
            "net.datafaker" % "datafaker" % "2.0.1",
            "org.scalameta" %% "munit" % "0.7.29" % Test
        )
    )
