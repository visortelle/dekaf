package consumer.message_filter.basic_message_filter.targets

import com.tools.teal.pulsar.ui.api.v1.consumer.JsonModifier

trait BasicMessageFilterTargetTrait:
    def resolveVarName(): String
