package producer.pulsar_producer_config.message_routing_mode

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.MessageRoutingMode as PulsarMessageRoutingMode

type MessageRoutingMode = PulsarMessageRoutingMode

object MessageRoutingMode:
    def fromPb(v: pb.MessageRoutingMode): Option[PulsarMessageRoutingMode] =
        v match
            case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_CUSTOM_PARTITION => Some(PulsarMessageRoutingMode.CustomPartition)
            case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_ROUND_ROBIN_PARTITION => Some(PulsarMessageRoutingMode.RoundRobinPartition)
            case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_SINGLE_PARTITION => Some(PulsarMessageRoutingMode.SinglePartition)
            case _ => None

    def toPb(v: Option[PulsarMessageRoutingMode]): pb.MessageRoutingMode =
        v match
            case Some(PulsarMessageRoutingMode.CustomPartition) => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_CUSTOM_PARTITION
            case Some(PulsarMessageRoutingMode.RoundRobinPartition) => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_ROUND_ROBIN_PARTITION
            case Some(PulsarMessageRoutingMode.SinglePartition) => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_SINGLE_PARTITION
            case _ => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_UNSPECIFIED
