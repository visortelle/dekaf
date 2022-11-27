package envoy

import zio.*
import org.apache.commons.lang3.SystemUtils

case class Windows()
case class Linux()
case class Darwin()
type OS = Windows | Linux | Darwin

case class Amd64()
case class Arm64()
type Arch = Amd64 | Arm64

def getOs: IO[String, OS] =
    if SystemUtils.IS_OS_WINDOWS then ZIO.succeed(Windows())
    else if SystemUtils.IS_OS_LINUX then ZIO.succeed(Linux())
    else if SystemUtils.IS_OS_MAC then ZIO.succeed(Darwin())
    else ZIO.fail("Unsupported OS")

def getArch: IO[String, Arch] = SystemUtils.OS_ARCH match
    case "amd64"   => ZIO.succeed(Amd64())
    case "aarch64" => ZIO.succeed(Arm64())
    case _         => ZIO.fail("Unsupported architecture")
