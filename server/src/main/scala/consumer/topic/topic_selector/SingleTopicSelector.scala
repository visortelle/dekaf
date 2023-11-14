package consumer.topic.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class SingleTopicSelector(topicFqn: String)

object SingleTopicSelector:
    def fromPb(v: pb.SingleTopicSelector): SingleTopicSelector =
        SingleTopicSelector(topicFqn = v.topicFqn)
        
    def toPb(v: SingleTopicSelector): pb.SingleTopicSelector =
        pb.SingleTopicSelector(topicFqn = v.topicFqn)
