import zio.*
import _root_.topics.primitives

object MainApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.attempt(println("Starting app..."))
        _ <- primitives.Primitives.startProduce()
    } yield ()
