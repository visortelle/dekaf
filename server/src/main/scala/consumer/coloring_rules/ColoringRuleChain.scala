package consumer.coloring_rules

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ColoringRuleChain(
    isEnabled: Boolean,
    coloringRules: Vector[ColoringRule]
)

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
