package library.managed_items

import consumer.start_from.LatestMessage
import library.ManagedItemGen

object ManagedConsumerSessionConfigSpecGen:
    def currentTopic: ManagedConsumerSessionConfigSpec =
        ManagedConsumerSessionConfigSpec(
            startFrom = ManagedConsumerSessionStartFromValOrRef(
                value = Some(
                    ManagedItemGen.fromSpec(ManagedConsumerSessionStartFromSpecGen.fromVariant(LatestMessage())).asInstanceOf[ManagedConsumerSessionStartFrom]
                )
            ),
            targets = Vector(
                ManagedConsumerSessionTargetValOrRef(
                    value = Some(
                        ManagedItemGen.fromSpec(ManagedConsumerSessionTargetSpecGen.currentTopic).asInstanceOf[ManagedConsumerSessionTarget]
                    )
                )
            ),
            messageFilterChain = ManagedMessageFilterChainValOrRef(
                value = Some(
                    ManagedItemGen.fromSpec(ManagedMessageFilterChainSpecGen.empty).asInstanceOf[ManagedMessageFilterChain]
                )
            ),
            pauseTriggerChain = ManagedConsumerSessionPauseTriggerChainValOrRef(
                value = Some(
                    ManagedItemGen.fromSpec(ManagedConsumerSessionPauseTriggerChainSpecGen.empty).asInstanceOf[ManagedConsumerSessionPauseTriggerChain]
                )
            ),
            coloringRuleChain = ManagedColoringRuleChainValOrRef(
                value = Some(
                    ManagedItemGen.fromSpec(ManagedColoringRuleChainSpecGen.empty).asInstanceOf[ManagedColoringRuleChain]
                )
            ),
            valueProjectionList = ManagedValueProjectionListValOrRef(
                value = Some(
                    ManagedItemGen.fromSpec(ManagedValueProjectionListSpecGen.empty).asInstanceOf[ManagedValueProjectionList]
                )
            ),
            numDisplayItems = None
        )
