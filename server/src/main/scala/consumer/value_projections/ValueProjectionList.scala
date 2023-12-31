package consumer.value_projections

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import org.apache.pulsar.client.admin.PulsarAdmin

case class ValueProjectionList(
    projections: Vector[ValueProjection]
)

object ValueProjectionList:
    def fromPb(v: pb.ValueProjectionList): ValueProjectionList =
        ValueProjectionList(
            projections = v.projections.map(ValueProjection.fromPb).toVector
        )

    def toPb(v: ValueProjectionList): pb.ValueProjectionList =
        pb.ValueProjectionList(
            projections = v.projections.map(ValueProjection.toPb)
        )
