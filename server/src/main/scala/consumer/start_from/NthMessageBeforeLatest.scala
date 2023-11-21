package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class NthMessageBeforeLatest(n: Long)

object NthMessageBeforeLatest:
    def fromPb(v: pb.NthMessageBeforeLatest): NthMessageBeforeLatest =
        NthMessageBeforeLatest(n = v.n)

    def toPb(v: NthMessageBeforeLatest): pb.NthMessageBeforeLatest =
        pb.NthMessageBeforeLatest(n = v.n)
