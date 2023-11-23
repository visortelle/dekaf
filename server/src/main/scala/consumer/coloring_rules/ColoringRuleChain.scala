package consumer.coloring_rules

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.session_runner.{MessageJson, MessageValueToJsonResult, ConsumerSessionContext}

type MatchedColoringRuleIndexes = Vector[Int]

case class ColoringRuleChain(
    isEnabled: Boolean,
    coloringRules: Vector[ColoringRule]
):
    def test(
        consumerSessionContext: ConsumerSessionContext,
        jsonMessage: MessageJson,
        jsonValue: MessageValueToJsonResult
    ): Either[String, MatchedColoringRuleIndexes] =
        if !isEnabled then
            return Right(Vector.empty)

        Right(Vector(2))

object ColoringRuleChain:
    def fromPb(v: pb.ColoringRuleChain): ColoringRuleChain =
        ColoringRuleChain(
            isEnabled = v.isEnabled,
            coloringRules = v.coloringRules.map(ColoringRule.fromPb).toVector
        )
    def toPb(v: ColoringRuleChain): pb.ColoringRuleChain =
        pb.ColoringRuleChain(
            isEnabled = v.isEnabled,
            coloringRules = v.coloringRules.map(ColoringRule.toPb)
        )

    def empty: ColoringRuleChain = ColoringRuleChain(coloringRules = Vector.empty, isEnabled = true)
