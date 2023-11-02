package consumer

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import zio.*
import zio.concurrent.ConcurrentMap
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionsController(
    sessions: ConcurrentMap[String, ConsumerSession]
) {
    def createSession(
        sessionId: String,
        sessionConfigPb: pb.ConsumerSessionConfig,
        pulsarClient: PulsarClient,
        pulsarAdmin: PulsarAdmin
    ): Task[Unit] = for {
        session <- ConsumerSession.createFromPb(
            pulsarClient = pulsarClient,
            pulsarAdmin = pulsarAdmin,
            sessionId = sessionId,
            sessionConfigPb = sessionConfigPb
        )
        _ <- sessions.putIfAbsent(sessionId, session)
    } yield ()

    def pauseSession(sessionId: String): UIO[Unit] = for {
        session <- sessions.get(sessionId)
        _ <- session.pause()
    } yield ()

    def resumeSession(sessionId: String): UIO[Unit] = for {
        session <- sessions.get(sessionId)
        _ <- session.resume()
    } yield ()

    def deleteSession(sessionId: String): UIO[Unit] = for {
        session <- sessions.get(sessionId)
        _ <- session.stop()
        _ <- sessions.remove(sessionId)
    } yield ()
}
