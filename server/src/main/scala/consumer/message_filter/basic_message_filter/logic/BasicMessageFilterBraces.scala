package consumer.message_filter.basic_message_filter.logic

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilterBraces (
    mode: BasicMessageFilterBracesMode,
    ops: Vector[BasicMessageFilterOp]
)

object BasicMessageFilterBraces:
    def fromPb(v: pb.BasicMessageFilterBraces): BasicMessageFilterBraces =
        BasicMessageFilterBraces(
            mode = BasicMessageFilterBracesMode.fromPb(v.mode),
            ops = v.ops.map(BasicMessageFilterOp.fromPb).toVector
        )

    def toPb(v: BasicMessageFilterBraces): pb.BasicMessageFilterBraces =
        pb.BasicMessageFilterBraces(
            mode = BasicMessageFilterBracesMode.toPb(v.mode),
            ops = v.ops.map(BasicMessageFilterOp.toPb)
        )
