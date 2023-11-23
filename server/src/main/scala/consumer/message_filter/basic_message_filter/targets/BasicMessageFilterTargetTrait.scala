package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.ConsumerSessionContext

trait BasicMessageFilterTargetTrait:
    def resolveVarName(sessionContext: ConsumerSessionContext): Either[String, String]
