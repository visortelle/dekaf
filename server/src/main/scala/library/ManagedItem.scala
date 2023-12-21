package library

import _root_.library.managed_items.{
    ManagedColoringRule,
    ManagedColoringRuleChain,
    ManagedConsumerSessionConfig,
    ManagedConsumerSessionEvent,
    ManagedConsumerSessionPauseTriggerChain,
    ManagedConsumerSessionStartFrom,
    ManagedConsumerSessionTarget,
    ManagedDateTime,
    ManagedMessageFilter,
    ManagedMessageFilterChain,
    ManagedMessageId,
    ManagedRelativeDateTime,
    ManagedTopicSelector,
    ManagedMarkdownDocument
}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

type ManagedItem =
    ManagedColoringRule |
    ManagedColoringRuleChain |
    ManagedConsumerSessionConfig |
    ManagedConsumerSessionEvent |
    ManagedConsumerSessionPauseTriggerChain |
    ManagedConsumerSessionStartFrom |
    ManagedConsumerSessionTarget |
    ManagedDateTime |
    ManagedMessageFilter |
    ManagedMessageFilterChain |
    ManagedMessageId |
    ManagedRelativeDateTime |
    ManagedTopicSelector |
    ManagedMarkdownDocument

object ManagedItem:
    def fromPb(v: pb.ManagedItem): ManagedItem =
        v.spec match
            case it: pb.ManagedItem.Spec.SpecColoringRule => ManagedColoringRule.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecColoringRuleChain => ManagedColoringRuleChain.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionConfig => ManagedConsumerSessionConfig.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionEvent => ManagedConsumerSessionEvent.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionPauseTriggerChain => ManagedConsumerSessionPauseTriggerChain.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionStartFrom => ManagedConsumerSessionStartFrom.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecConsumerSessionTarget => ManagedConsumerSessionTarget.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecDateTime => ManagedDateTime.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMessageFilter => ManagedMessageFilter.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMessageFilterChain => ManagedMessageFilterChain.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMessageId => ManagedMessageId.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecRelativeDateTime => ManagedRelativeDateTime.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecTopicSelector => ManagedTopicSelector.fromPb(it.value)
            case it: pb.ManagedItem.Spec.SpecMarkdownDocument => ManagedMarkdownDocument.fromPb(it.value)
            case _ => throw new IllegalArgumentException("Unknown ManagedItem type")

    def toPb(v: ManagedItem): pb.ManagedItem =
        v match
            case it: ManagedColoringRule =>
                val itPb = ManagedColoringRule.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecColoringRule(itPb))
            case it: ManagedColoringRuleChain =>
                val itPb = ManagedColoringRuleChain.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecColoringRuleChain(itPb))
            case it: ManagedConsumerSessionConfig =>
                val itPb = ManagedConsumerSessionConfig.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecConsumerSessionConfig(itPb))
            case it: ManagedConsumerSessionEvent =>
                val itPb = ManagedConsumerSessionEvent.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecConsumerSessionEvent(itPb))
            case it: ManagedConsumerSessionPauseTriggerChain =>
                val itPb = ManagedConsumerSessionPauseTriggerChain.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecConsumerSessionPauseTriggerChain(itPb))
            case it: ManagedConsumerSessionStartFrom =>
                val itPb = ManagedConsumerSessionStartFrom.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecConsumerSessionStartFrom(itPb))
            case it: ManagedConsumerSessionTarget =>
                val itPb = ManagedConsumerSessionTarget.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecConsumerSessionTarget(itPb))
            case it: ManagedDateTime =>
                val itPb = ManagedDateTime.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecDateTime(itPb))
            case it: ManagedMessageFilter =>
                val itPb = ManagedMessageFilter.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecMessageFilter(itPb))
            case it: ManagedMessageFilterChain =>
                val itPb = ManagedMessageFilterChain.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecMessageFilterChain(itPb))
            case it: ManagedMessageId =>
                val itPb = ManagedMessageId.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecMessageId(itPb))
            case it: ManagedRelativeDateTime =>
                val itPb = ManagedRelativeDateTime.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecRelativeDateTime(itPb))
            case it: ManagedTopicSelector =>
                val itPb = ManagedTopicSelector.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecTopicSelector(itPb))
            case it: ManagedMarkdownDocument =>
                val itPb = ManagedMarkdownDocument.toPb(it)
                pb.ManagedItem(spec = pb.ManagedItem.Spec.SpecMarkdownDocument(itPb))
