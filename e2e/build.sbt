val scala3Version = "3.2.1"
val zioVersion = "2.0.5"
val pulsarVersion = "2.10.3"

Test / fork := true

lazy val root = project
  .in(file("."))
  .settings(
    name := "spec",
    version := "0.1.0-SNAPSHOT",

    scalaVersion := scala3Version,

    libraryDependencies ++= Seq(
      "dev.zio" %% "zio-test" % zioVersion % Test,
      "dev.zio" %% "zio-test-sbt" % zioVersion % Test,
      "dev.zio" %% "zio-test-magnolia" % zioVersion % Test,
      "com.dimafeng" %% "testcontainers-scala-scalatest" % "0.40.12" % Test,

      "dev.zio" % "zio-direct_3" % "1.0.0-RC1",
      "com.microsoft.playwright" % "playwright" % "1.28.1",
      "net.datafaker" % "datafaker" % "1.7.0",

      // Pulsar
      "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
      "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,
    ),
    testFrameworks += new TestFramework("zio.test.sbt.ZTestFramework")
  )
