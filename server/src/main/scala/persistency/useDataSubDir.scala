package persistency

import zio.*
import _root_.config.readConfig

def useDataSubDir(subDirName: String): Task[os.Path] = for {
    config <- readConfig
    dir = os.Path(s"${config.dataDir.get}/${subDirName}", os.pwd)
    subDirExists <- ZIO.attempt(os.exists(dir, true))
    _ <- (ZIO.logInfo(s"Creating dir: ${dir.toString}") *>
        ZIO.attempt(os.makeDir.all(dir, os.PermSet.fromString("rwx------")))).unless(subDirExists)
} yield dir
