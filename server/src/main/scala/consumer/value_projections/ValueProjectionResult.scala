package consumer.value_projections

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ValueProjectionResult(
    displayValue: Option[String]
)

object ValueProjectionResult:
    def fromPb(v: pb.ValueProjectionResult): ValueProjectionResult =
        ValueProjectionResult(displayValue = v.displayValue)

    def toPb(v: ValueProjectionResult): pb.ValueProjectionResult =
        pb.ValueProjectionResult(displayValue = v.displayValue)
