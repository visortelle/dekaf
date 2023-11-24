package consumer.message_filter.basic_message_filter.operations

import _root_.consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

trait TestOpTrait:
    def genJsCode(target: BasicMessageFilterTargetTrait): String
