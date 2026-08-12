package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import com.tools.teal.pulsar.ui.api.v1.consumer as apiPb
import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedConsumerSessionConfigSpec(
    startFrom: ManagedConsumerSessionStartFromValOrRef,
    targets: Vector[ManagedConsumerSessionTargetValOrRef],
    messageFilterChain: ManagedMessageFilterChainValOrRef,
    pauseTriggerChain: ManagedConsumerSessionPauseTriggerChainValOrRef,
    coloringRuleChain: ManagedColoringRuleChainValOrRef,
    valueProjectionList: ManagedValueProjectionListValOrRef,
    numDisplayItems: Option[Long],
    // Missing and UNSPECIFIED both use GUARANTEED, the product default - owner decision
    // (2026-08-11, direct instruction), the third move of this default (the plan file's decision
    // log is the record). Pre-existing saved items carry no field at all and run the default;
    // explicit Best effort and Fastest are choices and are preserved.
    messageDeliveryOrder: Option[apiPb.MessageDeliveryOrder] = Some(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED),
    deliveryOrderKey: Option[apiPb.DeliveryOrderKey] = None
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
            numDisplayItems = v.numDisplayItems,
            messageDeliveryOrder = Some(normalizeMessageDeliveryOrder(v.messageDeliveryOrder)),
            deliveryOrderKey = Option.when(v.deliveryOrderKey != apiPb.DeliveryOrderKey.DELIVERY_ORDER_KEY_UNSPECIFIED)(v.deliveryOrderKey)
        )

    def toPb(v: ManagedConsumerSessionConfigSpec): pb.ManagedConsumerSessionConfigSpec =
        pb.ManagedConsumerSessionConfigSpec(
            startFrom = Some(ManagedConsumerSessionStartFromValOrRef.toPb(v.startFrom)),
            targets = v.targets.map(ManagedConsumerSessionTargetValOrRef.toPb),
            messageFilterChain = Some(ManagedMessageFilterChainValOrRef.toPb(v.messageFilterChain)),
            pauseTriggerChain = Some(ManagedConsumerSessionPauseTriggerChainValOrRef.toPb(v.pauseTriggerChain)),
            coloringRuleChain = Some(ManagedColoringRuleChainValOrRef.toPb(v.coloringRuleChain)),
            valueProjectionList = Some(ManagedValueProjectionListValOrRef.toPb(v.valueProjectionList)),
            numDisplayItems = v.numDisplayItems,
            messageDeliveryOrder = v.messageDeliveryOrder
                .map(normalizeMessageDeliveryOrder)
                .getOrElse(apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED),
            deliveryOrderKey = v.deliveryOrderKey.getOrElse(apiPb.DeliveryOrderKey.DELIVERY_ORDER_KEY_UNSPECIFIED)
        )

    private def normalizeMessageDeliveryOrder(v: apiPb.MessageDeliveryOrder): apiPb.MessageDeliveryOrder = v match
        case apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED                => v
        case apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME => v
        case apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED                  => v
        case apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED                 =>
            apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED
        case _: apiPb.MessageDeliveryOrder.Unrecognized =>
            apiPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED

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
