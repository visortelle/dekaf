package consumer

import org.apache.pulsar.client.api.SubscriptionInitialPosition as PulsarSubscriptionInitialPosition
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp.Timestamp

import java.time.Instant

def jsMessageFilterFromPb(filter: pb.JsMessageFilter): JsMessageFilter =
    JsMessageFilter(jsCode = filter.jsCode)
def jsMessageFilterToPb(filter: JsMessageFilter): pb.JsMessageFilter =
    pb.JsMessageFilter(jsCode = filter.jsCode)

def basicMessageFilterFromPb(filter: pb.BasicMessageFilter): BasicMessageFilter =
    BasicMessageFilter()
def basicMessageFilterToPb(filter: BasicMessageFilter): pb.BasicMessageFilter =
    pb.BasicMessageFilter()

def messageFilterFromPb(filter: pb.MessageFilter): MessageFilter =
    filter.value.js
        .map(jsFilter =>
            MessageFilter(
                isEnabled = filter.isEnabled,
                isNegated = filter.isNegated,
                `type` = MessageFilterType.JsMessageFilter,
                value = jsMessageFilterFromPb(jsFilter)
            )
        )
        .getOrElse(
            filter.value.basic
                .map(basicFilter =>
                    MessageFilter(
                        isEnabled = filter.isEnabled,
                        isNegated = filter.isNegated,
                        `type` = MessageFilterType.BasicMessageFilter,
                        value = basicMessageFilterFromPb(basicFilter)
                    )
                )
                .getOrElse(throw new IllegalArgumentException("Invalid message filter"))
        )

def messageFilterToPb(filter: MessageFilter): pb.MessageFilter =
    filter match
        case MessageFilter(isEnabled, isNegated, _, JsMessageFilter(jsCode)) =>
            pb.MessageFilter(isEnabled = isEnabled, isNegated = isNegated, value = pb.MessageFilter.Value.Js(pb.JsMessageFilter(jsCode)))
        case MessageFilter(isEnabled, isNegated, _, BasicMessageFilter()) =>
            pb.MessageFilter(
                isEnabled = isEnabled,
                isNegated = isNegated,
                value = pb.MessageFilter.Value.Basic(pb.BasicMessageFilter())
            )

def messageFilterChainModeFromPb(mode: pb.MessageFilterChainMode): MessageFilterChainMode =
    mode match
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL => MessageFilterChainMode.All()
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY => MessageFilterChainMode.Any()

def messageFilterChainModeToPb(mode: MessageFilterChainMode): pb.MessageFilterChainMode =
    mode match
        case MessageFilterChainMode.All() => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL
        case MessageFilterChainMode.Any() => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY

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

def consumerSessionConfigStartFromFromPb(startFrom: pb.ConsumerSessionConfigStartFrom): ConsumerSessionConfigStartFrom =
    startFrom.value match
        case pb.ConsumerSessionConfigStartFrom.Value.EarliestMessage(_) =>
            ConsumerSessionConfigStartFrom(`type` = ConsumerSessionConfigStartFromType.EarliestMessage, value = EarliestMessage())
        case pb.ConsumerSessionConfigStartFrom.Value.LatestMessage(_) =>
            ConsumerSessionConfigStartFrom(`type` = ConsumerSessionConfigStartFromType.LatestMessage, value = LatestMessage())
        case pb.ConsumerSessionConfigStartFrom.Value.MessageId(v) =>
            ConsumerSessionConfigStartFrom(`type` = ConsumerSessionConfigStartFromType.MessageId, value = MessageId(messageId = v.messageId.toByteArray))
        case pb.ConsumerSessionConfigStartFrom.Value.DateTime(v) =>
            ConsumerSessionConfigStartFrom(
                `type` = ConsumerSessionConfigStartFromType.DateTime,
                value = DateTime(dateTime = Instant.ofEpochSecond(v.dateTime.get.seconds, v.dateTime.get.nanos))
            )
        case pb.ConsumerSessionConfigStartFrom.Value.RelativeDateTime(v) =>
            val relativeDateTime = RelativeDateTime(
                value = v.value,
                unit = dateTimeUnitFromPb(v.unit),
                isRoundedToUnitStart = v.isRoundedToUnitStart
            )
            ConsumerSessionConfigStartFrom(`type` = ConsumerSessionConfigStartFromType.RelativeDateTime, value = relativeDateTime)

def consumerSessionConfigStartFromToPb(startFrom: ConsumerSessionConfigStartFrom): pb.ConsumerSessionConfigStartFrom =
    startFrom match
        case ConsumerSessionConfigStartFrom(_, EarliestMessage()) =>
            pb.ConsumerSessionConfigStartFrom(value = pb.ConsumerSessionConfigStartFrom.Value.EarliestMessage(pb.EarliestMessage()))
        case ConsumerSessionConfigStartFrom(_, LatestMessage()) =>
            pb.ConsumerSessionConfigStartFrom(value = pb.ConsumerSessionConfigStartFrom.Value.LatestMessage(pb.LatestMessage()))
        case ConsumerSessionConfigStartFrom(_, MessageId(messageId)) =>
            pb.ConsumerSessionConfigStartFrom(
                value = pb.ConsumerSessionConfigStartFrom.Value.MessageId(
                    pb.MessageId(messageId = ByteString.copyFrom(messageId))
                )
            )
        case ConsumerSessionConfigStartFrom(_, DateTime(dateTime)) =>
            pb.ConsumerSessionConfigStartFrom(
                value = pb.ConsumerSessionConfigStartFrom.Value.DateTime(
                    pb.DateTime(dateTime = Some(Timestamp(seconds = dateTime.getEpochSecond, nanos = dateTime.getNano)))
                )
            )
        case ConsumerSessionConfigStartFrom(_, RelativeDateTime(value, unit, isRoundedToUnitStart)) =>
            pb.ConsumerSessionConfigStartFrom(
                value = pb.ConsumerSessionConfigStartFrom.Value.RelativeDateTime(
                    pb.RelativeDateTime(
                        value = value,
                        unit = dateTimeUnitToPb(unit),
                        isRoundedToUnitStart = isRoundedToUnitStart
                    )
                )
            )

def messageFilterChainFromPb(chain: pb.MessageFilterChain): MessageFilterChain =
    MessageFilterChain(
        isEnabled = chain.isEnabled,
        isNegated = chain.isNegated,
        filters = chain.filters.map(messageFilterFromPb).toList,
        mode = messageFilterChainModeFromPb(chain.mode)
    )

def messageFilterChainToPb(chain: MessageFilterChain): pb.MessageFilterChain =
    pb.MessageFilterChain(
        isEnabled = chain.isEnabled,
        isNegated = chain.isNegated,
        filters = chain.filters.map(messageFilterToPb),
        mode = messageFilterChainModeToPb(chain.mode)
    )

def consumerSessionConfigFromPb(config: pb.ConsumerSessionConfig): ConsumerSessionConfig =
    ConsumerSessionConfig(
        startFrom = consumerSessionConfigStartFromFromPb(config.startFrom.get),
        messageFilterChain = messageFilterChainFromPb(config.messageFilterChain.get),
        pauseTriggers = List.empty
    )

def consumerSessionConfigToPb(config: ConsumerSessionConfig): pb.ConsumerSessionConfig =
    pb.ConsumerSessionConfig(
        startFrom = Some(consumerSessionConfigStartFromToPb(config.startFrom)),
        messageFilterChain = Some(messageFilterChainToPb(config.messageFilterChain)),
        pauseTriggers = List.empty
    )
