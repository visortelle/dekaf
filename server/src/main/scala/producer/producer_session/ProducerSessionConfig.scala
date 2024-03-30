package producer.producer_session

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import _root_.producer.producer_session.producer_session_task.ProducerSessionTask

case class ProducerSessionConfig(
    tasks: Vector[ProducerSessionTask]
)

object ProducerSessionConfig:
    def fromPb(v: pb.ProducerSessionConfig): ProducerSessionConfig =
        ProducerSessionConfig(
            tasks = v.tasks.map(ProducerSessionTask.fromPb).toVector
        )

    def toPb(v: ProducerSessionConfig): pb.ProducerSessionConfig =
        pb.ProducerSessionConfig(
            tasks = v.tasks.map(ProducerSessionTask.toPb)
        )
