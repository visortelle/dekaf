val scala3Version = "3.3.0"
val pulsarVersion = "3.0.0"
val zioVersion = "2.0.15"

lazy val root = project
  .in(file("."))
  .settings(
    name := "pulsar-demoapp",
    version := "0.1.0-SNAPSHOT",

    scalaVersion := scala3Version,

    libraryDependencies ++= Seq(
      // Pulsar
      "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
      "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,

      // ZIO
      "dev.zio" %% "zio" % zioVersion,

      "net.datafaker" % "datafaker" % "2.0.1",
      "org.scalameta" %% "munit" % "0.7.29" % Test
    )
  )
