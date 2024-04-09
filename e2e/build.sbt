val scala3Version = "3.4.1"
val pulsarVersion = "3.2.2"
val testcontainersScalaVersion = "0.41.3"

Test / fork := true

lazy val root = project
  .in(file("."))
  .settings(
    name := "spec",
    version := "0.1.0-SNAPSHOT",

    scalaVersion := scala3Version,

    libraryDependencies ++= Seq(
      "org.scalameta" %% "munit" % "0.7.29" % Test,
      "com.dimafeng" %% "testcontainers-scala-munit" % testcontainersScalaVersion % "it",

      "com.microsoft.playwright" % "playwright" % "1.42.0",
      "net.datafaker" % "datafaker" % "2.1.0",

      // Pulsar
      "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
      "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,
    ),
    testFrameworks += new TestFramework("munit.Framework")
  )
