package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedProducerSessionConfigTask(
    task: ManagedProducerTaskValOrRef
)

object ManagedProducerSessionConfigTask:
    def fromPb(v: pb.ManagedProducerSessionConfigTask): ManagedProducerSessionConfigTask =
        val task = v.task match
            case pb.ManagedProducerSessionConfigTask.Task.TaskProducer(v) =>
                ManagedProducerTaskValOrRef.fromPb(v)

        ManagedProducerSessionConfigTask(
            task = task
        )
    def toPb(v: ManagedProducerSessionConfigTask): pb.ManagedProducerSessionConfigTask =
        val task = v.task match
            case v: ManagedProducerTaskValOrRef =>
                pb.ManagedProducerSessionConfigTask.Task.TaskProducer(ManagedProducerTaskValOrRef.toPb(v))
            case _ =>
                throw new Exception("Invalid ManagedProducerSessionConfigTask type")

        pb.ManagedProducerSessionConfigTask(
            task = task
        )
