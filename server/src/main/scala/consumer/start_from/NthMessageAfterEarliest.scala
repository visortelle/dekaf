package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class NthMessageAfterEarliest (n: Long)
object NthMessageAfterEarliest:
    def fromPb(v: pb.NthMessageAfterEarliest): NthMessageAfterEarliest =
        NthMessageAfterEarliest(n = v.n)

    def toPb(v: NthMessageAfterEarliest): pb.NthMessageAfterEarliest =
        pb.NthMessageAfterEarliest(n = v.n)
