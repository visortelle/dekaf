package consumer.topic.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class MultiTopicSelector(topicFqns: Vector[String])

object MultiTopicSelector:
    def fromPb(v: pb.MultiTopicSelector): MultiTopicSelector =
        MultiTopicSelector(topicFqns = v.topicFqns.toVector)
        
    def toPb(v: MultiTopicSelector): pb.MultiTopicSelector =
        pb.MultiTopicSelector(topicFqns = v.topicFqns)
