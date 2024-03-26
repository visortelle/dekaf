package producer.producer_session.producer_session_task

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import _root_.producer.producer_task.ProducerTask

case class ProducerSessionTask(
    task: ProducerTask,
)

object ProducerSessionTask:
    def fromPb(v: pb.ProducerSessionTask): ProducerSessionTask =
        val task = v.task match
            case pb.ProducerSessionTask.Task.TaskProducer(v) =>
                ProducerTask.fromPb(v)
            case _ => throw Exception("Invalid producer session task type")

        ProducerSessionTask(
            task = task,
        )

    def toPb(v: ProducerSessionTask): pb.ProducerSessionTask =
        val task = v.task match
            case v: ProducerTask =>
                pb.ProducerSessionTask.Task.TaskProducer(ProducerTask.toPb(v))
            case _ => throw Exception("Invalid producer session task type")

        pb.ProducerSessionTask(
            task = task,
        )
