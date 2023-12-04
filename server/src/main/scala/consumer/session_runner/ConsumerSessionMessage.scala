package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message

case class ConsumerSessionMessage(
    messagePb: consumerPb.Message,
    messageAsJsonOmittingValue: MessageAsJsonOmittingValue,
    messageValueAsJson: MessageValueAsJson
)
