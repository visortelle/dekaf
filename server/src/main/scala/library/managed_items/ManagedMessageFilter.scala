package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import _root_.consumer.message_filter.MessageFilter
import _root_.consumer.message_filter.basic_message_filter.BasicMessageFilter
import _root_.consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import _root_.consumer.message_filter.JsMessageFilter
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb

case class ManagedMessageFilterSpec(
    isEnabled: Boolean,
    isNegated: Boolean,
    targetField: ManagedBasicMessageFilterTargetValOrRef,
    filter: BasicMessageFilter | JsMessageFilter
)

object ManagedMessageFilterSpec:
    def fromPb(v: pb.ManagedMessageFilterSpec): ManagedMessageFilterSpec =
        ManagedMessageFilterSpec(
            isEnabled = v.isEnabled,
            isNegated = v.isNegated,
            targetField = ManagedBasicMessageFilterTargetValOrRef.fromPb(v.targetField.get),
            filter = v.filter match
                case pb.ManagedMessageFilterSpec.Filter.FilterBasic(v) =>
                    BasicMessageFilter.fromPb(v)
                case pb.ManagedMessageFilterSpec.Filter.FilterJs(v) =>
                    JsMessageFilter.fromPb(v)
        )

    def toPb(v: ManagedMessageFilterSpec): pb.ManagedMessageFilterSpec =
        pb.ManagedMessageFilterSpec(
            isEnabled = v.isEnabled,
            isNegated = v.isNegated,
            targetField = Some(ManagedBasicMessageFilterTargetValOrRef.toPb(v.targetField)),
            filter = v.filter match
                case f: BasicMessageFilter =>
                    pb.ManagedMessageFilterSpec.Filter.FilterBasic(BasicMessageFilter.toPb(f))
                case f: JsMessageFilter =>
                    pb.ManagedMessageFilterSpec.Filter.FilterJs(JsMessageFilter.toPb(f))
        )

case class ManagedMessageFilter(
    metadata: ManagedItemMetadata,
    spec: ManagedMessageFilterSpec
) extends ManagedItemTrait

object ManagedMessageFilter:
    def fromPb(v: pb.ManagedMessageFilter): ManagedMessageFilter =
        ManagedMessageFilter(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedMessageFilterSpec.fromPb(v.spec.get)
        )

    def toPb(v: ManagedMessageFilter): pb.ManagedMessageFilter =
        pb.ManagedMessageFilter(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedMessageFilterSpec.toPb(v.spec))
        )

case class ManagedMessageFilterValOrRef(
    value: Option[ManagedMessageFilter],
    reference: Option[ManagedItemReference]
)

object ManagedMessageFilterValOrRef:
    def fromPb(v: pb.ManagedMessageFilterValOrRef): ManagedMessageFilterValOrRef =
        v.valOrRef match
            case pb.ManagedMessageFilterValOrRef.ValOrRef.Val(v) =>
                ManagedMessageFilterValOrRef(
                    value = Some(ManagedMessageFilter.fromPb(v)),
                    reference = None
                )
            case pb.ManagedMessageFilterValOrRef.ValOrRef.Ref(v) =>
                ManagedMessageFilterValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedMessageFilterValOrRef): pb.ManagedMessageFilterValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedMessageFilterValOrRef(
                    valOrRef = pb.ManagedMessageFilterValOrRef.ValOrRef.Val(ManagedMessageFilter.toPb(v))
                )
            case None =>
                pb.ManagedMessageFilterValOrRef(
                    valOrRef = pb.ManagedMessageFilterValOrRef.ValOrRef.Ref(v.reference.get)
                )
