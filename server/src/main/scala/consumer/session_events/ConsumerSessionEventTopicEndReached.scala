package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventTopicEndReached()

object ConsumerSessionEventTopicEndReached:
    def fromPb(v: pb.ConsumerSessionEventTopicEndReached): ConsumerSessionEventTopicEndReached =
        ConsumerSessionEventTopicEndReached()

    def toPb(v: ConsumerSessionEventTopicEndReached): pb.ConsumerSessionEventTopicEndReached =
        pb.ConsumerSessionEventTopicEndReached()
