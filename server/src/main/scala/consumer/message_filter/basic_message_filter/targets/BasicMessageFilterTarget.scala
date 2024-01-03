package consumer.message_filter.basic_message_filter.targets

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.json_modifier.JsonModifier

case class BasicMessageFilterTarget(
    target: BasicMessageFilterTargetTrait,
    jsonModifier: Option[JsonModifier] = None
) extends BasicMessageFilterTargetTrait:
    def resolveVarName(): String = jsonModifier match
        case None => target.resolveVarName()
        case Some(modifier) =>
            s"""
               |(${modifier.modifier.jsCode})(${target.resolveVarName()})
               |""".stripMargin

object BasicMessageFilterTarget:
    def fromPb(v: pb.BasicMessageFilterTarget): BasicMessageFilterTarget =
        val jsonModifier = v.jsonModifier.map(JsonModifier.fromPb)

        v.target match
            case pb.BasicMessageFilterTarget.Target.TargetKey(target) =>
                BasicMessageFilterTarget(
                    target = BasicMessageFilterKeyTarget.fromPb(target),
                    jsonModifier = jsonModifier
                )
            case pb.BasicMessageFilterTarget.Target.TargetValue(target) =>
                BasicMessageFilterTarget(
                    target = BasicMessageFilterValueTarget.fromPb(target),
                    jsonModifier = jsonModifier
                )
            case _ => throw new Exception("Failed to convert BasicMessageFilterTarget. Unknown type")

    def toPb(v: BasicMessageFilterTarget): pb.BasicMessageFilterTarget =
        val jsonModifier = v.jsonModifier.map(JsonModifier.toPb)

        v.target match
            case target: BasicMessageFilterKeyTarget =>
                pb.BasicMessageFilterTarget(
                    target = pb.BasicMessageFilterTarget.Target.TargetKey(BasicMessageFilterKeyTarget.toPb(target)),
                    jsonModifier = jsonModifier
                )
            case target: BasicMessageFilterValueTarget =>
                pb.BasicMessageFilterTarget(
                    target = pb.BasicMessageFilterTarget.Target.TargetValue(BasicMessageFilterValueTarget.toPb(target)),
                    jsonModifier = jsonModifier
                )
