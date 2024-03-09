package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import _root_.consumer.start_from.{EarliestMessage, LatestMessage, NthMessageAfterEarliest, NthMessageBeforeLatest}

case class ManagedConsumerSessionStartFromSpec(
    startFrom: EarliestMessage | LatestMessage | ManagedConsumerSessionStartFromValOrRef | ManagedMessageIdValOrRef | ManagedDateTimeValOrRef |
        ManagedRelativeDateTimeValOrRef | NthMessageBeforeLatest | NthMessageAfterEarliest
)

object ManagedConsumerSessionStartFromSpec:
    def fromPb(v: pb.ManagedConsumerSessionStartFromSpec): ManagedConsumerSessionStartFromSpec =
        v.startFrom match
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromEarliestMessage =>
                ManagedConsumerSessionStartFromSpec(startFrom = EarliestMessage())
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromLatestMessage => ManagedConsumerSessionStartFromSpec(startFrom = LatestMessage())
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromMessageId =>
                ManagedConsumerSessionStartFromSpec(startFrom = ManagedMessageIdValOrRef.fromPb(sf.value))
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromDateTime =>
                ManagedConsumerSessionStartFromSpec(startFrom = ManagedDateTimeValOrRef.fromPb(sf.value))
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromRelativeDateTime =>
                ManagedConsumerSessionStartFromSpec(startFrom = ManagedRelativeDateTimeValOrRef.fromPb(sf.value))
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromNthMessageAfterEarliest =>
                ManagedConsumerSessionStartFromSpec(startFrom = NthMessageAfterEarliest.fromPb(sf.value))
            case sf: pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromNthMessageBeforeLatest =>
                ManagedConsumerSessionStartFromSpec(startFrom = NthMessageBeforeLatest.fromPb(sf.value))
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedConsumerSessionStartFromSpec type")

    def toPb(v: ManagedConsumerSessionStartFromSpec): pb.ManagedConsumerSessionStartFromSpec =
        v.startFrom match
            case v: EarliestMessage =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromEarliestMessage(consumerPb.EarliestMessage())
                )
            case v: LatestMessage =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromLatestMessage(consumerPb.LatestMessage())
                )
            case v: ManagedMessageIdValOrRef =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromMessageId(ManagedMessageIdValOrRef.toPb(v))
                )
            case v: ManagedDateTimeValOrRef =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromDateTime(ManagedDateTimeValOrRef.toPb(v))
                )
            case v: ManagedRelativeDateTimeValOrRef =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromRelativeDateTime(ManagedRelativeDateTimeValOrRef.toPb(v))
                )
            case v: NthMessageAfterEarliest =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromNthMessageAfterEarliest(NthMessageAfterEarliest.toPb(v))
                )
            case v: NthMessageBeforeLatest =>
                pb.ManagedConsumerSessionStartFromSpec(
                    startFrom = pb.ManagedConsumerSessionStartFromSpec.StartFrom.StartFromNthMessageBeforeLatest(NthMessageBeforeLatest.toPb(v))
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedConsumerSessionStartFromSpec type")

case class ManagedConsumerSessionStartFrom(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionStartFromSpec
) extends ManagedItemTrait

object ManagedConsumerSessionStartFrom:
    def fromPb(v: pb.ManagedConsumerSessionStartFrom): ManagedConsumerSessionStartFrom =
        ManagedConsumerSessionStartFrom(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedConsumerSessionStartFromSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedConsumerSessionStartFrom): pb.ManagedConsumerSessionStartFrom =
        pb.ManagedConsumerSessionStartFrom(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedConsumerSessionStartFromSpec.toPb(v.spec))
        )

case class ManagedConsumerSessionStartFromValOrRef(
    value: Option[ManagedConsumerSessionStartFrom],
    reference: Option[ManagedItemReference]
)

object ManagedConsumerSessionStartFromValOrRef:
    def fromPb(v: pb.ManagedConsumerSessionStartFromValOrRef): ManagedConsumerSessionStartFromValOrRef =
        v.valOrRef match
            case pb.ManagedConsumerSessionStartFromValOrRef.ValOrRef.Val(v) =>
                ManagedConsumerSessionStartFromValOrRef(
                    value = Some(ManagedConsumerSessionStartFrom.fromPb(v)),
                    reference = None
                )
            case pb.ManagedConsumerSessionStartFromValOrRef.ValOrRef.Ref(v) =>
                ManagedConsumerSessionStartFromValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedConsumerSessionStartFromValOrRef type")

    def toPb(v: ManagedConsumerSessionStartFromValOrRef): pb.ManagedConsumerSessionStartFromValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedConsumerSessionStartFromValOrRef(
                    valOrRef = pb.ManagedConsumerSessionStartFromValOrRef.ValOrRef.Val(ManagedConsumerSessionStartFrom.toPb(v))
                )
            case None =>
                pb.ManagedConsumerSessionStartFromValOrRef(
                    valOrRef = pb.ManagedConsumerSessionStartFromValOrRef.ValOrRef.Ref(v.reference.get)
                )
