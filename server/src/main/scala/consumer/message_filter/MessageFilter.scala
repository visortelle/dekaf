package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.BasicMessageFilter
import _root_.consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import consumer.message_filter.JsMessageFilter
import consumer.session_runner.TestResult
import org.graalvm.polyglot.Context

case class MessageFilter(
    isEnabled: Boolean,
    isNegated: Boolean,
    targetField: BasicMessageFilterTarget,
    filter: BasicMessageFilter | JsMessageFilter
):
    def test(polyglotContext: Context): TestResult =
        val result = filter match
            case f: BasicMessageFilter => f.test(polyglotContext, targetField)
            case f: JsMessageFilter => f.test(polyglotContext, targetField)

        result

object MessageFilter:
    def fromPb(v: pb.MessageFilter): MessageFilter =
        v.filter.filterJs
            .map(jsFilter =>
                MessageFilter(
                    isEnabled = v.isEnabled,
                    isNegated = v.isNegated,
                    targetField = BasicMessageFilterTarget.fromPb(v.targetField.get),
                    filter = JsMessageFilter.fromPb(jsFilter)
                )
            )
            .getOrElse(
                v.filter.filterBasic
                    .map(basicFilter =>
                        MessageFilter(
                            isEnabled = v.isEnabled,
                            isNegated = v.isNegated,
                            targetField = BasicMessageFilterTarget.fromPb(v.targetField.get),
                            filter = BasicMessageFilter.fromPb(basicFilter)
                        )
                    )
                    .getOrElse(throw new IllegalArgumentException("Invalid message filter"))
            )

    def toPb(v: MessageFilter): pb.MessageFilter =
        pb.MessageFilter(
            isEnabled = v.isEnabled,
            isNegated = v.isNegated,
            targetField = Some(BasicMessageFilterTarget.toPb(v.targetField)),
            filter = v.filter match
                case f: BasicMessageFilter =>
                    pb.MessageFilter.Filter.FilterBasic(BasicMessageFilter.toPb(f))
                case f: JsMessageFilter =>
                    pb.MessageFilter.Filter.FilterJs(JsMessageFilter.toPb(f))
        )
