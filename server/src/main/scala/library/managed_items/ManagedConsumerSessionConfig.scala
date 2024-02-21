package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedConsumerSessionConfigSpec(
    startFrom: ManagedConsumerSessionStartFromValOrRef,
    targets: Vector[ManagedConsumerSessionTargetValOrRef],
    messageFilterChain: ManagedMessageFilterChainValOrRef,
    pauseTriggerChain: ManagedConsumerSessionPauseTriggerChainValOrRef,
    coloringRuleChain: ManagedColoringRuleChainValOrRef,
    valueProjectionList: ManagedValueProjectionListValOrRef,
    numDisplayItems: Option[Long]
)

object ManagedConsumerSessionConfigSpec:
    def fromPb(v: pb.ManagedConsumerSessionConfigSpec): ManagedConsumerSessionConfigSpec =
        ManagedConsumerSessionConfigSpec(
            startFrom = ManagedConsumerSessionStartFromValOrRef.fromPb(v.getStartFrom),
            targets = v.targets.map(ManagedConsumerSessionTargetValOrRef.fromPb).toVector,
            messageFilterChain = ManagedMessageFilterChainValOrRef.fromPb(v.getMessageFilterChain),
            pauseTriggerChain = ManagedConsumerSessionPauseTriggerChainValOrRef.fromPb(v.getPauseTriggerChain),
            coloringRuleChain = ManagedColoringRuleChainValOrRef.fromPb(v.getColoringRuleChain),
            valueProjectionList = ManagedValueProjectionListValOrRef.fromPb(v.getValueProjectionList),
            numDisplayItems = v.numDisplayItems
        )

    def toPb(v: ManagedConsumerSessionConfigSpec): pb.ManagedConsumerSessionConfigSpec =
        pb.ManagedConsumerSessionConfigSpec(
            startFrom = Some(ManagedConsumerSessionStartFromValOrRef.toPb(v.startFrom)),
            targets = v.targets.map(ManagedConsumerSessionTargetValOrRef.toPb),
            messageFilterChain = Some(ManagedMessageFilterChainValOrRef.toPb(v.messageFilterChain)),
            pauseTriggerChain = Some(ManagedConsumerSessionPauseTriggerChainValOrRef.toPb(v.pauseTriggerChain)),
            coloringRuleChain = Some(ManagedColoringRuleChainValOrRef.toPb(v.coloringRuleChain)),
            valueProjectionList = Some(ManagedValueProjectionListValOrRef.toPb(v.valueProjectionList)),
            numDisplayItems = v.numDisplayItems
        )

case class ManagedConsumerSessionConfig(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionConfigSpec
) extends ManagedItemTrait

object ManagedConsumerSessionConfig:
    def fromPb(v: pb.ManagedConsumerSessionConfig): ManagedConsumerSessionConfig =
        ManagedConsumerSessionConfig(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedConsumerSessionConfigSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedConsumerSessionConfig): pb.ManagedConsumerSessionConfig =
        pb.ManagedConsumerSessionConfig(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedConsumerSessionConfigSpec.toPb(v.spec))
        )

case class ManagedConsumerSessionConfigValOrRef(
    value: Option[ManagedConsumerSessionConfig],
    reference: Option[ManagedItemReference]
)

object ManagedConsumerSessionConfigValOrRef:
    def fromPb(v: pb.ManagedConsumerSessionConfigValOrRef): ManagedConsumerSessionConfigValOrRef =
        v.valOrRef match
            case pb.ManagedConsumerSessionConfigValOrRef.ValOrRef.Val(v) =>
                ManagedConsumerSessionConfigValOrRef(
                    value = Some(ManagedConsumerSessionConfig.fromPb(v)),
                    reference = None
                )
            case pb.ManagedConsumerSessionConfigValOrRef.ValOrRef.Ref(v) =>
                ManagedConsumerSessionConfigValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedConsumerSessionConfigValOrRef type")

    def toPb(v: ManagedConsumerSessionConfigValOrRef): pb.ManagedConsumerSessionConfigValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedConsumerSessionConfigValOrRef(
                    valOrRef = pb.ManagedConsumerSessionConfigValOrRef.ValOrRef.Val(ManagedConsumerSessionConfig.toPb(v))
                )
            case None =>
                pb.ManagedConsumerSessionConfigValOrRef(
                    valOrRef = pb.ManagedConsumerSessionConfigValOrRef.ValOrRef.Ref(v.reference.get)
                )
