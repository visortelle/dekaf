package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class MessageFilter(
    isEnabled: Boolean,
    isNegated: Boolean,
    value: BasicMessageFilter | JsMessageFilter
)

object MessageFilter:
    def fromPb(v: pb.MessageFilter): MessageFilter =
        v.filter.filterJs
            .map(jsFilter =>
                MessageFilter(
                    isEnabled = v.isEnabled,
                    isNegated = v.isNegated,
                    value = JsMessageFilter.fromPb(jsFilter)
                )
            )
            .getOrElse(
                v.filter.filterBasic
                    .map(basicFilter =>
                        MessageFilter(
                            isEnabled = v.isEnabled,
                            isNegated = v.isNegated,
                            value = BasicMessageFilter.fromPb(basicFilter)
                        )
                    )
                    .getOrElse(throw new IllegalArgumentException("Invalid message filter"))
            )

    def toPb(v: MessageFilter): pb.MessageFilter =
        v match
            case MessageFilter(isEnabled, isNegated, messageFilter: BasicMessageFilter) =>
                pb.MessageFilter(
                    isEnabled = isEnabled,
                    isNegated = isNegated,
                    filter = pb.MessageFilter.Filter.FilterBasic(BasicMessageFilter.toPb(messageFilter))
                )
            case MessageFilter(isEnabled, isNegated, messageFilter: JsMessageFilter) =>
                pb.MessageFilter(isEnabled = isEnabled, isNegated = isNegated, filter = pb.MessageFilter.Filter.FilterJs(JsMessageFilter.toPb(messageFilter)))
