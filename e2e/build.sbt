val scala3Version = "3.3.3"
val pulsarVersion = "3.2.1"        // aligned with server/ (PulsarAdmin + PulsarClient)
val playwrightVersion = "1.47.0"
val scalatestVersion = "3.2.19"

ThisBuild / scalaVersion := scala3Version

lazy val root = project
  .in(file("."))
  .settings(
    name := "dekaf-e2e",
    version := "0.1.0-SNAPSHOT",

    // One forked JVM; tests run sequentially (single shared browser). Parallelism comes later
    // via multiple forked runners once the suite is large.
    Test / fork := true,
    Test / parallelExecution := false,

    // The green lane. `sbt test` excludes the deliberately-red `KnownBug` regressions, so a normal
    // run is expected to pass. Scoped to the `test` task ONLY - scoping it to `Test` would also apply
    // to `testOnly`, where it would cancel out an explicit `-n KnownBug` and silently run 0 tests.
    //   sbt test                          -> green lane (KnownBug excluded)
    //   sbt "testOnly * -- -n KnownBug"   -> bug lane (only the regressions; all should fail)
    Test / test / testOptions += Tests.Argument(TestFrameworks.ScalaTest, "-l", "KnownBug"),

    // A navigable static HTML report (test tree, durations, failure detail) written to
    // target/test-html, for CI to upload as a downloadable artifact. ScalaTest's `-h` reporter
    // renders via flexmark (dependency below). Scoped to the `test` task, like `-l` above, so it
    // runs on `sbt test` (the CI green lane) without slowing targeted `testOnly` runs.
    Test / test / testOptions += Tests.Argument(TestFrameworks.ScalaTest, "-h", "target/test-html"),

    // Silence JDK-21 reflective-access warnings from the Pulsar client's Netty transport.
    Test / javaOptions ++= Seq(
      "--add-opens=java.base/java.lang=ALL-UNNAMED",
      "--add-opens=java.base/java.nio=ALL-UNNAMED",
      "--add-opens=java.base/jdk.internal.misc=ALL-UNNAMED",
      "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
      "--add-opens=java.base/sun.net=ALL-UNNAMED",   // Pulsar DnsResolverUtil
    ),

    libraryDependencies ++= Seq(
      // Browser automation (page objects + harness live in src/main → compile scope)
      "com.microsoft.playwright" % "playwright" % playwrightVersion,

      // Admin + test-data generation, all-JVM
      "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
      "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,

      "net.datafaker" % "datafaker" % "2.0.2",
      "org.slf4j" % "slf4j-simple" % "2.0.13",   // quiet the Pulsar client's SLF4J

      // Test framework
      "org.scalatest" %% "scalatest" % scalatestVersion % Test,
      // Renders ScalaTest's `-h` HTML report (see testOptions above); required on the classpath.
      "com.vladsch.flexmark" % "flexmark-all" % "0.64.8" % Test,
    ),
  )
