val scala3Version = "3.2.1"
val graalvmVersion = "22.3.0"
val pulsarVersion = "2.10.2"
val circeVersion = "0.14.3"
val zioConfigVersion = "3.0.2"

maintainer := "kiryl_valkovich@teal.tools"

lazy val root = project
    .enablePlugins(GraalVMNativeImagePlugin)
    .enablePlugins(GitVersioning)
    .enablePlugins(BuildInfoPlugin)
    .enablePlugins(NativeImagePlugin)
    .in(file("."))
    .settings(
      name := "pulsar-ui",
      scalaVersion := scala3Version,
      Compile / mainClass := Some("main.Main"),
      nativeImageInstalled := true,
      nativeImageOptions ++= Seq(
        s"-H:ReflectionConfigurationFiles=${target.value / "native-image-configs" / "reflect-config.json"}",
        s"-H:ConfigurationFileDirectories=${target.value / "native-image-configs"}",
        "-H:Log=registerResource:5",
        "-H:IncludeResources=ui/.*",
        "-H:+JNI",
        "--language:js",
        "-H:+ReportExceptionStackTraces",
        "-H:-CheckToolchain",
        "--enable-preview",
        "--initialize-at-build-time=ch.qos.logback",
        "--initialize-at-build-time=org.snakeyaml",
        "--initialize-at-run-time=io.netty",
        "--trace-object-instantiation=ch.qos.logback.core.AsyncAppenderBase$Worker",
        "--trace-class-initialization=ch.qos.logback.classic.Logger"
      ),
      buildInfoPackage := "buildinfo",
      buildInfoOptions += BuildInfoOption.BuildTime,
      buildInfoOptions += BuildInfoOption.ToMap,
      git.useGitDescribe := true,
//      Compile / packageDoc / mappings := Seq(), // https://github.com/sbt/sbt-native-packager/issues/651
      libraryDependencies ++= Seq(
        // Testing
        "org.scalameta" %% "munit" % "0.7.29" % Test,
        // Logging
        "ch.qos.logback" % "logback-classic" % "1.4.5",
        "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5",
        // Pulsar
        "org.apache.pulsar" % "pulsar-client-original" % pulsarVersion,
        "org.apache.pulsar" % "pulsar-client-admin-original" % pulsarVersion,
        "io.netty" % "netty-all" % "4.1.82.Final", // Needed by pulsar-client-original
        // GraalVM
        "org.graalvm.truffle" % "truffle-api" % graalvmVersion,
        "org.graalvm.js" % "js" % graalvmVersion,

        // ZIO
        "dev.zio" %% "zio" % "2.0.4",
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
        "io.javalin" % "javalin" % "5.2.0",
        "io.javalin" % "javalin-rendering" % "5.2.0",
        "org.freemarker" % "freemarker" % "2.3.31",
        "javax.annotation" % "javax.annotation-api" % "1.3.2",

        // Uncategorized
        "org.apache.commons" % "commons-lang3" % "3.12.0",
        "tech.allegro.schema.json2avro" % "converter" % "0.2.15",
        "com.google.guava" % "guava" % "31.1-jre",
        "com.lihaoyi" %% "os-lib" % "0.8.1"
      )
    )

// Protobuf stuff. See also /project/scalapb.sbt
libraryDependencies ++= Seq(
  "com.google.protobuf" % "protobuf-java" % "3.21.9",
  "com.thesamet.scalapb" %% "scalapb-runtime" % scalapb.compiler.Version.scalapbVersion % "protobuf",
  "io.grpc" % "grpc-netty" % scalapb.compiler.Version.grpcJavaVersion,
  "io.grpc" % "grpc-services" % scalapb.compiler.Version.grpcJavaVersion,
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % scalapb.compiler.Version.scalapbVersion
)
