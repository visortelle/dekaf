package producer.message_generator.access_mode

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.ProducerAccessMode as ProducerAccessMode

type AccessMode = ProducerAccessMode

object AccessMode:
    def fromPb(v: pb.AccessMode): ProducerAccessMode  =
        v match
            case pb.AccessMode.ACCESS_MODE_SHARED => ProducerAccessMode.Shared
            case pb.AccessMode.ACCESS_MODE_EXCLUSIVE => ProducerAccessMode.Exclusive
            case pb.AccessMode.ACCESS_MODE_WAIT_FOR_EXCLUSIVE => ProducerAccessMode.WaitForExclusive
            case pb.AccessMode.ACCESS_MODE_EXCLUSIVE_WITH_FENCING => ProducerAccessMode.ExclusiveWithFencing
            case _ => throw Exception(s"Unknown consumer access mode: $v")


    def toPb(v: ProducerAccessMode): pb.AccessMode =
        v match
            case ProducerAccessMode.Shared => pb.AccessMode.ACCESS_MODE_SHARED
            case ProducerAccessMode.Exclusive => pb.AccessMode.ACCESS_MODE_EXCLUSIVE
            case ProducerAccessMode.WaitForExclusive => pb.AccessMode.ACCESS_MODE_WAIT_FOR_EXCLUSIVE
            case ProducerAccessMode.ExclusiveWithFencing => pb.AccessMode.ACCESS_MODE_EXCLUSIVE_WITH_FENCING
            case _ => throw Exception(s"Unknown consumer access mode: $v")
