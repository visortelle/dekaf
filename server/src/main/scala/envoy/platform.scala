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

def getArch: IO[Throwable, Arch] = SystemUtils.OS_ARCH match
    case "x86_64"   => ZIO.succeed(Amd64())
    case "aarch64" => ZIO.succeed(Arm64())
    case _         => ZIO.fail(new Exception("Unsupported architecture"))

def getEnvoyBinaryPath: IO[Throwable, os.ResourcePath] =
    for
        _ <- ZIO.attempt(println(s"ARCHITECTURE: ${SystemUtils.OS_ARCH}"))
        currentOs <- getOs
        currentArch <- getArch
        path <- (currentOs, currentArch) match
            case (Darwin(), Amd64()) => ZIO.succeed(os.resource / "envoy" / "darwin" / "amd64" / "envoy.bin")
            case _                   => ZIO.fail(new Exception(s"Unsupported OS/architecture combination: $currentOs/$currentArch"))
        content <- ZIO.attempt(os.read(path))
        _ <- ZIO.attempt(println(s"CONTENT: ${content}"))
    yield path
