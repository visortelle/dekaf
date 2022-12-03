package envoy

import zio.*
import org.apache.commons.lang3.SystemUtils
import os as os

case class Windows()
case class Linux()
case class Darwin()
type OS = Windows | Linux | Darwin

case class Amd64()
case class Arm64()
type Arch = Amd64 | Arm64

def getOs: IO[Throwable, OS] =
    if SystemUtils.IS_OS_WINDOWS then ZIO.succeed(Windows())
    else if SystemUtils.IS_OS_LINUX then ZIO.succeed(Linux())
    else if SystemUtils.IS_OS_MAC then ZIO.succeed(Darwin())
    else ZIO.fail(new Exception("Unsupported OS"))

def getArch: IO[Throwable, Arch] =
    val arch = SystemUtils.OS_ARCH
    arch match
        case "x86_64"  => ZIO.succeed(Amd64())
        case "amd64"  => ZIO.succeed(Amd64())
        case "aarch64" => ZIO.succeed(Arm64())
        case _         => ZIO.fail(new Exception(s"Unsupported architecture: ${arch}"))

def getEnvoyBinResourcePath: IO[Throwable, os.ResourcePath] =
    for
        currentOs <- getOs
        currentArch <- getArch
        path <- (currentOs, currentArch) match
            case (Darwin(), Amd64()) => ZIO.succeed(os.resource / "envoy" / "darwin" / "amd64" / "envoy.bin")

            // Rely on the Rosetta 2 subsystem that emulates x86_64 on Apple Silicon
            case (Darwin(), Arm64()) => ZIO.succeed(os.resource / "envoy" / "darwin" / "amd64" / "envoy.bin")
            case _                   => ZIO.fail(new Exception(s"Unsupported OS/architecture combination: $currentOs/$currentArch"))
    yield path

def getEnvoyBinPath: IO[Throwable, os.Path] =
    for
        binResourcePath <- getEnvoyBinResourcePath
        binOut <- ZIO.attempt(os.temp.dir(null, "pulsar-ui") / "envoy")
        _ <- ZIO.logInfo(s"Copying Envoy proxy binary to temp directory: ${binOut.toString}")
        _ <- ZIO.attempt(os.write(binOut, binResourcePath.toSource, "r-xr-xr-x"))
    yield binOut
