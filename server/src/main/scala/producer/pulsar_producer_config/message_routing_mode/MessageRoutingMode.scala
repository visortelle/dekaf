package producer.pulsar_producer_config.message_routing_mode

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.MessageRoutingMode as PulsarMessageRoutingMode

type MessageRoutingMode = PulsarMessageRoutingMode

object MessageRoutingMode:
    def fromPb(v: pb.MessageRoutingMode): PulsarMessageRoutingMode  =
        v match
            case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_CUSTOM_PARTITION => PulsarMessageRoutingMode.CustomPartition
            case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_ROUND_ROBIN_PARTITION => PulsarMessageRoutingMode.RoundRobinPartition
            case pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_SINGLE_PARTITION => PulsarMessageRoutingMode.SinglePartition
            case _ => throw Exception(s"Unknown message routing mode: $v")

    def toPb(v: PulsarMessageRoutingMode): pb.MessageRoutingMode =
        v match
            case PulsarMessageRoutingMode.CustomPartition => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_CUSTOM_PARTITION
            case PulsarMessageRoutingMode.RoundRobinPartition => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_ROUND_ROBIN_PARTITION
            case PulsarMessageRoutingMode.SinglePartition => pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_SINGLE_PARTITION
            case _ => throw Exception(s"Unknown message routing mode: $v")
