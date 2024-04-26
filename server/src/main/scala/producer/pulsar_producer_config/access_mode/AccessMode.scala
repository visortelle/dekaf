package producer.pulsar_producer_config.access_mode

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.ProducerAccessMode as ProducerAccessMode

type AccessMode = ProducerAccessMode

object AccessMode:
    def fromPb(v: pb.AccessMode): Option[ProducerAccessMode]  =
        v match
            case pb.AccessMode.ACCESS_MODE_SHARED => Some(ProducerAccessMode.Shared)
            case pb.AccessMode.ACCESS_MODE_EXCLUSIVE => Some(ProducerAccessMode.Exclusive)
            case pb.AccessMode.ACCESS_MODE_WAIT_FOR_EXCLUSIVE => Some(ProducerAccessMode.WaitForExclusive)
            case pb.AccessMode.ACCESS_MODE_EXCLUSIVE_WITH_FENCING => Some(ProducerAccessMode.ExclusiveWithFencing)
            case _ => None


    def toPb(v: Option[ProducerAccessMode]): pb.AccessMode =
        v match
            case Some(ProducerAccessMode.Shared) => pb.AccessMode.ACCESS_MODE_SHARED
            case Some(ProducerAccessMode.Exclusive) => pb.AccessMode.ACCESS_MODE_EXCLUSIVE
            case Some(ProducerAccessMode.WaitForExclusive) => pb.AccessMode.ACCESS_MODE_WAIT_FOR_EXCLUSIVE
            case Some(ProducerAccessMode.ExclusiveWithFencing) => pb.AccessMode.ACCESS_MODE_EXCLUSIVE_WITH_FENCING
            case _ => pb.AccessMode.ACCESS_MODE_UNSPECIFIED
