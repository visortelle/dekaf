package consumer.message_filter.basic_message_filter.targets
import consumer.session_runner.ConsumerSessionContext

case class BasicMessageFilterKeyTarget() extends BasicMessageFilterTargetTrait:
    override def resolveVarName(sessionContext: ConsumerSessionContext): Either[String, String] = ???
//        sessionContext.context
