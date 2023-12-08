package nginx

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

def getNginxBinResourcePath: IO[Throwable, os.ResourcePath] =
    for
        currentOs <- getOs
        currentArch <- getArch
        path <- (currentOs, currentArch) match
            case (Darwin(), Amd64()) => ZIO.succeed(os.resource / "nginx" / "darwin" / "amd64" / "nginx")
            // Rely on the Rosetta 2 subsystem that emulates x86_64 on Apple Silicon
            case (Darwin(), Arm64()) => ZIO.succeed(os.resource / "nginx" / "darwin" / "amd64" / "nginx")
            case (Linux(), Amd64()) => ZIO.succeed(os.resource / "nginx" / "linux" / "amd64" / "nginx")
            case (Linux(), Arm64()) => ZIO.succeed(os.resource / "nginx" / "linux" / "arm64" / "nginx")
            case _                   => ZIO.fail(new Exception(s"Unsupported OS/architecture combination: $currentOs/$currentArch"))
    yield path

def getNginxBinPath: IO[Throwable, os.Path] =
    for
        binResourcePath <- getNginxBinResourcePath
        binOut <- ZIO.attempt(os.temp.dir(null, "dekaf") / "nginx")
        _ <- ZIO.logInfo(s"Copying Nginx binary to temp directory: ${binOut.toString}")
        _ <- ZIO.attempt({ os.write(binOut, binResourcePath.toSource, "r-xr-xr-x") })
    yield binOut
