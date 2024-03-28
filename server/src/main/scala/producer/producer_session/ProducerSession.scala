package producer.producer_session

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import _root_.producer.producer_session.producer_session_task.ProducerSessionTask

case class ProducerSession(
    sessionId: String,
    tasks: Vector[ProducerSessionTask]
)

object ProducerSession:
    def fromPb(v: pb.ProducerSession): ProducerSession =
        ProducerSession(
            sessionId = v.sessionId,
            tasks = v.tasks.map(ProducerSessionTask.fromPb).toVector
        )

    def toPb(v: ProducerSession): pb.ProducerSession =
        pb.ProducerSession(
            sessionId = v.sessionId,
            tasks = v.tasks.map(ProducerSessionTask.toPb)
        )
