addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.10.4") // Linter
addSbtPlugin("com.github.sbt" % "sbt-native-packager" % "1.9.16")
addSbtPlugin("com.timushev.sbt" % "sbt-updates" % "0.6.4")
addSbtPlugin("com.github.sbt" % "sbt-git" % "2.0.0")
addSbtPlugin("com.eed3si9n" % "sbt-buildinfo" % "0.11.0")
addSbtPlugin("net.vonbuchholtz" % "sbt-dependency-check" % "4.2.0") // SBT Plugin for OWASP DependencyCheck.

addSbtPlugin("com.thesamet" % "sbt-protoc" % "1.0.6")

libraryDependencies += "com.thesamet.scalapb" %% "compilerplugin" % "0.11.13"
