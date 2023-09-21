package consumer

import org.apache.pulsar.client.api.SubscriptionInitialPosition as PulsarSubscriptionInitialPosition
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp.Timestamp

import java.time.Instant

def messageFilterFromPb(filter: pb.MessageFilter): MessageFilter =
    filter.value.js
        .map(js => MessageFilter(`type` = MessageFilterType.JsMessageFilter, value = JsMessageFilter(js.jsCode)))
        .getOrElse(
            filter.value.basic
                .map(_ => MessageFilter(`type` = MessageFilterType.BasicMessageFilter, value = BasicMessageFilter()))
                .getOrElse(throw new IllegalArgumentException("Invalid message filter"))
        )

def messageFilterToPb(filter: MessageFilter): pb.MessageFilter =
    filter match
        case MessageFilter(_, JsMessageFilter(jsCode)) => pb.MessageFilter(value = pb.MessageFilter.Value.Js(pb.JsMessageFilter(jsCode)))
        case MessageFilter(_, BasicMessageFilter())    => pb.MessageFilter(value = pb.MessageFilter.Value.Basic(pb.BasicMessageFilter()))

def messageFilterChainModeFromPb(mode: pb.MessageFilterChainMode): MessageFilterChainMode =
    mode match
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL => MessageFilterChainMode.All
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY => MessageFilterChainMode.Any

def messageFilterChainModeToPb(mode: MessageFilterChainMode): pb.MessageFilterChainMode =
    mode match
        case MessageFilterChainMode.All => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL
        case MessageFilterChainMode.Any => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY

def dateTimeUnitFromPb(dateTimeUnit: pb.DateTimeUnit): DateTimeUnit =
    dateTimeUnit match
        case pb.DateTimeUnit.DATE_TIME_UNIT_YEAR   => DateTimeUnit.Year
        case pb.DateTimeUnit.DATE_TIME_UNIT_MONTH  => DateTimeUnit.Month
        case pb.DateTimeUnit.DATE_TIME_UNIT_WEEK   => DateTimeUnit.Week
        case pb.DateTimeUnit.DATE_TIME_UNIT_DAY    => DateTimeUnit.Day
        case pb.DateTimeUnit.DATE_TIME_UNIT_HOUR   => DateTimeUnit.Hour
        case pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE => DateTimeUnit.Minute
        case pb.DateTimeUnit.DATE_TIME_UNIT_SECOND => DateTimeUnit.Second

def dateTimeUnitToPb(dateTimeUnit: DateTimeUnit): pb.DateTimeUnit =
    dateTimeUnit match
        case DateTimeUnit.Year   => pb.DateTimeUnit.DATE_TIME_UNIT_YEAR
        case DateTimeUnit.Month  => pb.DateTimeUnit.DATE_TIME_UNIT_MONTH
        case DateTimeUnit.Week   => pb.DateTimeUnit.DATE_TIME_UNIT_WEEK
        case DateTimeUnit.Day    => pb.DateTimeUnit.DATE_TIME_UNIT_DAY
        case DateTimeUnit.Hour   => pb.DateTimeUnit.DATE_TIME_UNIT_HOUR
        case DateTimeUnit.Minute => pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE
        case DateTimeUnit.Second => pb.DateTimeUnit.DATE_TIME_UNIT_SECOND

def startFromFromPb(startFrom: pb.StartFrom): StartFrom =
    startFrom.value match
        case pb.StartFrom.Value.EarliestMessage(_) => StartFrom(`type` = StartFromType.EarliestMessage, value = StartFromEarliestMessage())
        case pb.StartFrom.Value.LatestMessage(_)   => StartFrom(`type` = StartFromType.LatestMessage, value = StartFromLatestMessage())
        case pb.StartFrom.Value.MessageId(v) => StartFrom(`type` = StartFromType.MessageId, value = StartFromMessageId(messageId = v.messageId.toByteArray))
        case pb.StartFrom.Value.DateTime(v) =>
            StartFrom(
                `type` = StartFromType.DateTime,
                value = StartFromDateTime(dateTime = Instant.ofEpochSecond(v.dateTime.get.seconds, v.dateTime.get.nanos))
            )
        case pb.StartFrom.Value.RelativeDateTime(v) =>
            val relativeDateTime = StartFromRelativeDateTime(
                value = v.value,
                unit = dateTimeUnitFromPb(v.unit),
                isRoundToUnitStart = v.isRoundToUnitStart
            )
            StartFrom(`type` = StartFromType.RelativeDateTime, value = relativeDateTime)

def startFromToPb(startFrom: StartFrom): pb.StartFrom =
    startFrom match
        case StartFrom(_, StartFromEarliestMessage()) => pb.StartFrom(value = pb.StartFrom.Value.EarliestMessage(pb.StartFromEarliestMessage()))
        case StartFrom(_, StartFromLatestMessage())   => pb.StartFrom(value = pb.StartFrom.Value.LatestMessage(pb.StartFromLatestMessage()))
        case StartFrom(_, StartFromMessageId(messageId)) =>
            pb.StartFrom(value = pb.StartFrom.Value.MessageId(pb.StartFromMessageId(messageId = ByteString.copyFrom(messageId))))
        case StartFrom(_, StartFromDateTime(dateTime)) =>
            pb.StartFrom(
                value = pb.StartFrom.Value.DateTime(
                    pb.StartFromDateTime(dateTime = Some(Timestamp(seconds = dateTime.getEpochSecond, nanos = dateTime.getNano)))
                )
            )
        case StartFrom(_, StartFromRelativeDateTime(value, unit, isRoundToUnitStart)) =>
            pb.StartFrom(
                value = pb.StartFrom.Value.RelativeDateTime(
                    pb.StartFromRelativeDateTime(
                        value = value,
                        unit = dateTimeUnitToPb(unit),
                        isRoundToUnitStart = isRoundToUnitStart
                    )
                )
            )

def messageFilterChainFromPb(chain: pb.MessageFilterChain): MessageFilterChain =
    MessageFilterChain(
        filters = chain.filters.map(kv => kv._1 -> messageFilterFromPb(kv._2)),
        mode = messageFilterChainModeFromPb(chain.mode)
    )

def messageFilterChainToPb(chain: MessageFilterChain): pb.MessageFilterChain =
    pb.MessageFilterChain(
        filters = chain.filters.map(kv => kv._1 -> messageFilterToPb(kv._2)),
        mode = messageFilterChainModeToPb(chain.mode)
    )

def consumerSessionConfigFromPb(config: pb.ConsumerSessionConfig): ConsumerSessionConfig =
    ConsumerSessionConfig(
        startFrom = startFromFromPb(config.startFrom.get),
        messageFilterChain = messageFilterChainFromPb(config.messageFilterChain.get)
    )

def consumerSessionConfigToPb(config: ConsumerSessionConfig): pb.ConsumerSessionConfig =
    pb.ConsumerSessionConfig(
        startFrom = Some(startFromToPb(config.subscriptionInitialPosition)),
        messageFilterChain = Some(messageFilterChainToPb(config.messageFilterChain))
    )
