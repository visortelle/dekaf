val scala3Version = "3.3.0"
val pulsarVersion = "3.0.0"
val zioVersion = "2.0.15"
val circeVersion = "0.14.5"

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
            "org.apache.avro" % "avro" % "1.11.1",

            "com.fasterxml.jackson.core" % "jackson-core" % "2.15.2",
            "com.fasterxml.jackson.dataformat" % "jackson-dataformat-avro" % "2.15.2",
            "com.fasterxml.jackson.dataformat" % "jackson-dataformat-protobuf" % "2.15.2",

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
