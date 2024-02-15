#!/usr/bin/env -S scala-cli -S 3 -q

//> using dep "org.apache.commons:commons-lang3:3.14.0"

import org.apache.commons.lang3.SystemUtils
import java.nio.file.FileSystems
import java.nio.file.Paths

case class Windows()
case class Linux()
case class Darwin()
type OS = Windows | Linux | Darwin

case class Amd64()
case class Arm64()
type Arch = Amd64 | Arm64

def isPosix: Boolean =
    FileSystems.getDefault.supportedFileAttributeViews().contains("posix")

def getOs: OS =
    if SystemUtils.IS_OS_WINDOWS then Windows()
    else if SystemUtils.IS_OS_LINUX then Linux()
    else if SystemUtils.IS_OS_MAC then Darwin()
    else throw new Exception("Unsupported OS")

def getArch: Arch =
    val arch = SystemUtils.OS_ARCH
    arch match
        case "x86_64"  => Amd64()
        case "amd64"  => Amd64()
        case "aarch64" => Arm64()
        case _         => throw new Exception(s"Unsupported architecture: ${arch}")

def getEnvoyBin: String =
    val currentOs = getOs
    val currentArch = getArch

    (currentOs, currentArch) match
        case (Darwin(), Amd64()) => "envoy/darwin/amd64/envoy.bin"
        // Rely on the Rosetta 2 subsystem that emulates x86_64 on Apple Silicon
        case (Darwin(), Arm64()) => "envoy/darwin/amd64/envoy.bin"
        case (Linux(), Amd64()) => "envoy/linux/amd64/envoy.bin"
        case (Linux(), Arm64()) => "envoy/linux/arm64/envoy.bin"
        case (Windows(), Amd64()) => "envoy/windows/amd64/envoy.exe"
        case _                   => throw new Exception(s"Unsupported OS/architecture combination: $currentOs/$currentArch")

object Main extends App {
  println(getEnvoyBin)
}
