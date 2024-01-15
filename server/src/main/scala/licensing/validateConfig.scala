package licensing

import zio.*
import _root_.config.Config

def formatError(propName: String) = new Exception(s"Config error: $propName property is not set")

def validateConfig(config: Config): Either[Throwable, Unit] =
    Right(())

def validateConfigOrDie(config: Config): Task[Unit] = for {
    configValidationResult <- ZIO.succeed(validateConfig(config))
    _ <- configValidationResult match
        case Left(err) => ZIO.die(err)
        case Right(_)  => ZIO.unit
} yield ()
