package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.producer.message_generator.MessageGenerator
import producer.pulsar_producer_config.PulsarProducerConfig

case class ManagedProducerTaskSpec(
    topicSelector: ManagedTopicSelectorValOrRef,
    messageGenerator: ManagedMessageGeneratorValOrRef,
    producerConfig: PulsarProducerConfig,
    numMessages: Option[Long],
    limitDurationNanos: Option[Long],
    intervalNanos: Option[Long],
)

object ManagedProducerTaskSpec:
    def fromPb(v: pb.ManagedProducerTaskSpec): ManagedProducerTaskSpec =
        ManagedProducerTaskSpec( 
            topicSelector = ManagedTopicSelectorValOrRef.fromPb(v.topicSelector.get),
            messageGenerator = ManagedMessageGeneratorValOrRef.fromPb(v.messageGenerator.get),
            producerConfig = PulsarProducerConfig.fromPb(v.producerConfig.get),
            numMessages = v.numMessages,
            limitDurationNanos = v.limitDurationNanos,
            intervalNanos = v.intervalNanos
        )
    def toPb(v: ManagedProducerTaskSpec): pb.ManagedProducerTaskSpec =
        pb.ManagedProducerTaskSpec(
            topicSelector = Some(ManagedTopicSelectorValOrRef.toPb(v.topicSelector)),
            messageGenerator = Some(ManagedMessageGeneratorValOrRef.toPb(v.messageGenerator)),
            producerConfig = Some(PulsarProducerConfig.toPb(v.producerConfig)),
            numMessages = v.numMessages,
            limitDurationNanos = v.limitDurationNanos,
            intervalNanos = v.intervalNanos
        )

case class ManagedProducerTask(
    metadata: ManagedItemMetadata,
    spec: ManagedProducerTaskSpec
) extends ManagedItemTrait

object ManagedProducerTask:
    def fromPb(v: pb.ManagedProducerTask): ManagedProducerTask =
        ManagedProducerTask(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedProducerTaskSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedProducerTask): pb.ManagedProducerTask =
        pb.ManagedProducerTask(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedProducerTaskSpec.toPb(v.spec))
        )

case class ManagedProducerTaskValOrRef(
    value: Option[ManagedProducerTask],
    reference: Option[ManagedItemReference]
)

object ManagedProducerTaskValOrRef:
    def fromPb(v: pb.ManagedProducerTaskValOrRef): ManagedProducerTaskValOrRef =
        v.valOrRef match
            case pb.ManagedProducerTaskValOrRef.ValOrRef.Val(v) =>
                ManagedProducerTaskValOrRef(
                    value = Some(ManagedProducerTask.fromPb(v)),
                    reference = None
                )
            case pb.ManagedProducerTaskValOrRef.ValOrRef.Ref(v) =>
                ManagedProducerTaskValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedProducerTaskValOrRef type")

    def toPb(v: ManagedProducerTaskValOrRef): pb.ManagedProducerTaskValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedProducerTaskValOrRef(
                    valOrRef = pb.ManagedProducerTaskValOrRef.ValOrRef.Val(ManagedProducerTask.toPb(v))
                )
            case None =>
                pb.ManagedProducerTaskValOrRef(
                    valOrRef = pb.ManagedProducerTaskValOrRef.ValOrRef.Ref(v.reference.get)
                )
