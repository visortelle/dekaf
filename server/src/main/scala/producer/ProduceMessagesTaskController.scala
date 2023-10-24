package producer

import _root_.config.ConfigProvider

import zio.*
import zio.concurrent.ConcurrentMap

trait ProduceMessagesTaskController:
    def init(session: ProducerSession): Task[Unit]
    def resume(sessionId: String): Task[Unit]
    def pause(sessionId: String): Task[Unit]
    def finish(sessionId: String): Task[Unit]

case class ProducerMessagesTaskControllerImpl(
    configProvider: ConfigProvider,
    sessions: ConcurrentMap[String, ProducerSessionController]
) extends ProduceMessagesTaskController:
    override def init(session: ProducerSession): Task[Unit] = for {
        newSession <- ZIO.attempt(ProducerSessionControllerImpl.make(session))
        _ <- sessions.put(session.sessionId, newSession)
    } yield ()

    override def resume(sessionId: String): Task[Unit] = for {
        session <- sessions.get(sessionId).flatMap(ZIO.fromOption(_)).orElseFail(new Exception(s"Producer session with id $sessionId not found"))
        _ <- session.resume()
    } yield ()

    override def pause(sessionId: String): Task[Unit] = for {
        session <- sessions.get(sessionId).flatMap(ZIO.fromOption(_)).orElseFail(new Exception(s"Producer session with id $sessionId not found"))
        _ <- session.pause()
    } yield ()

    override def finish(sessionId: String): Task[Unit] = for {
        session <- sessions.get(sessionId).flatMap(ZIO.fromOption(_)).orElseFail(new Exception(s"Producer session with id $sessionId not found"))
        _ <- session.finish()
    } yield ()
