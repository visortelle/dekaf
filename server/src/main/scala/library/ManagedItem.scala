package library

import _root_.library.managed_items.{
    ManagedConsumerSessionConfig,
    ManagedConsumerSessionPauseTriggerChain,
    ManagedConsumerSessionStartFrom,
    ManagedDateTime,
    ManagedMessageFilter,
    ManagedMessageFilterChain,
    ManagedMessageId,
    ManagedRelativeDateTime
}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

type ManagedItem = ManagedConsumerSessionConfig | ManagedConsumerSessionStartFrom | ManagedConsumerSessionPauseTriggerChain | ManagedMessageId |
    ManagedDateTime | ManagedRelativeDateTime | ManagedMessageFilter | ManagedMessageFilterChain

object ManagedItem:
    def fromPb(v: pb.ManagedItem): ManagedItem =
        v.spec match
            case it: pb.ManagedItem.Spec.SpecConsumerSessionConfig => managedConsumerSessionConfigFromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionStartFrom => managedConsumerSessionStartFromFromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionPauseTriggerChain => managedConsumerSessionPauseTriggerChainFromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMessageId => ManagedMessageId.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecDateTime => ManagedDateTime.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecRelativeDateTime => ManagedRelativeDateTime.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMessageFilter => ManagedMessageFilter.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMessageFilterChain => ManagedMessageFilterChain.fro(it.value)
            case _ => throw new IllegalArgumentException("Unknown user managed item type")

    def managedItemToPb(v: ManagedItem): pb.ManagedItem =
        v match
            case it: ManagedConsumerSessionConfig =>
                val itPb = ManagedConsumerSessionConfig.toPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.ConsumerSessionConfig(itPb))
            case it: ManagedConsumerSessionStartFrom =>
                val itPb = managedConsumerSessionStartFromToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.ConsumerSessionStartFrom(itPb))
            case it: ManagedConsumerSessionPauseTriggerChain =>
                val itPb = managedConsumerSessionPauseTriggerChainToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.ConsumerSessionPauseTriggerChain(itPb))
            case it: ManagedMessageId =>
                val itPb = managedMessageIdToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.MessageId(itPb))
            case it: ManagedDateTime =>
                val itPb = managedDateTimeToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.DateTime(itPb))
            case it: ManagedRelativeDateTime =>
                val itPb = managedRelativeDateTimeToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.RelativeDateTime(itPb))
            case it: ManagedMessageFilter =>
                val itPb = managedMessageFilterToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.MessageFilter(itPb))
            case it: ManagedMessageFilterChain =>
                val itPb = managedMessageFilterChainToPb(it)
                pb.ManagedItem(item = pb.ManagedItem.Item.MessageFilterChain(itPb))
