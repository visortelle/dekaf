package library.managed_items

import consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import library.ManagedItemGen

object ManagedConsumerSessionTargetSpecGen:
    def currentTopic: ManagedConsumerSessionTargetSpec =
        ManagedConsumerSessionTargetSpec(
            isEnabled = true,
            messageValueDeserializer = ManagedDeserializerValOrRef(
               value = Some(ManagedItemGen.fromSpec(
                   ManagedDeserializerSpecGen.useLatestTopicSchema
               ).asInstanceOf[ManagedDeserializer])
            ),
            consumptionMode = ConsumerSessionTargetConsumptionMode(
                mode = RegularConsumptionMode(),
            ),
            topicSelector = ManagedTopicSelectorValOrRef(
                value = Some(ManagedItemGen.fromSpec(
                    ManagedTopicSelectorSpecGen.currentTopic
                ).asInstanceOf[ManagedTopicSelector])
            ),
            messageFilterChain = ManagedMessageFilterChainValOrRef(
               value = Some(ManagedItemGen.fromSpec(
                   ManagedMessageFilterChainSpecGen.empty
               ).asInstanceOf[ManagedMessageFilterChain])
            ),
            coloringRuleChain = ManagedColoringRuleChainValOrRef(
               value = Some(ManagedItemGen.fromSpec(
                   ManagedColoringRuleChainSpecGen.empty
               ).asInstanceOf[ManagedColoringRuleChain])
            ),
            valueProjectionList = ManagedValueProjectionListValOrRef(
               value = Some(ManagedItemGen.fromSpec(
                   ManagedValueProjectionListSpecGen.empty
               ).asInstanceOf[ManagedValueProjectionList])
            ),
        )
