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
                value = jsMessageFilterFromPb(jsFilter)
            )
        )
        .getOrElse(
            filter.value.basic
                .map(basicFilter =>
                    MessageFilter(
                        isEnabled = filter.isEnabled,
                        isNegated = filter.isNegated,
                        value = basicMessageFilterFromPb(basicFilter)
                    )
                )
                .getOrElse(throw new IllegalArgumentException("Invalid message filter"))
        )

def messageFilterToPb(filter: MessageFilter): pb.MessageFilter =
    filter match
        case MessageFilter(isEnabled, isNegated, JsMessageFilter(jsCode)) =>
            pb.MessageFilter(isEnabled = isEnabled, isNegated = isNegated, value = pb.MessageFilter.Value.Js(pb.JsMessageFilter(jsCode)))
        case MessageFilter(isEnabled, isNegated, BasicMessageFilter()) =>
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

def consumerSessionStartFromFromPb(startFrom: pb.ConsumerSessionStartFrom): ConsumerSessionStartFrom =
    startFrom.startFrom match
        case pb.ConsumerSessionStartFrom.StartFrom.StartFromEarliestMessage(_) => EarliestMessage()
        case pb.ConsumerSessionStartFrom.StartFrom.StartFromLatestMessage(_)   => LatestMessage()
        case pb.ConsumerSessionStartFrom.StartFrom.StartFromMessageId(v)       => MessageId(messageId = v.messageId.toByteArray)
        case pb.ConsumerSessionStartFrom.StartFrom.StartFromDateTime(v) =>
            DateTime(dateTime = Instant.ofEpochSecond(v.dateTime.get.seconds, v.dateTime.get.nanos))
        case pb.ConsumerSessionStartFrom.StartFrom.StartFromRelativeDateTime(v) =>
            RelativeDateTime(
                value = v.value,
                unit = dateTimeUnitFromPb(v.unit),
                isRoundedToUnitStart = v.isRoundedToUnitStart
            )

def consumerSessionStartFromToPb(startFrom: ConsumerSessionStartFrom): pb.ConsumerSessionStartFrom =
    startFrom match
        case v: EarliestMessage =>
            pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromEarliestMessage(pb.EarliestMessage()))
        case v: LatestMessage =>
            pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromLatestMessage(pb.LatestMessage()))
        case v: MessageId =>
            pb.ConsumerSessionStartFrom(
                startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromMessageId(
                    pb.MessageId(messageId = ByteString.copyFrom(v.messageId))
                )
            )
        case v: DateTime =>
            pb.ConsumerSessionStartFrom(
                startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromDateTime(
                    pb.DateTime(dateTime = Some(Timestamp(seconds = v.dateTime.getEpochSecond, nanos = v.dateTime.getNano)))
                )
            )
        case v: RelativeDateTime =>
            pb.ConsumerSessionStartFrom(
                startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromRelativeDateTime(
                    pb.RelativeDateTime(
                        value = v.value,
                        unit = dateTimeUnitToPb(v.unit),
                        isRoundedToUnitStart = v.isRoundedToUnitStart
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
        startFrom = consumerSessionStartFromFromPb(config.startFrom.get),
        messageFilterChain = messageFilterChainFromPb(config.messageFilterChain.get),
        pauseTriggerChain = ???
    )

def consumerSessionConfigToPb(config: ConsumerSessionConfig): pb.ConsumerSessionConfig =
    pb.ConsumerSessionConfig(
        startFrom = Some(consumerSessionStartFromToPb(config.startFrom)),
        messageFilterChain = Some(messageFilterChainToPb(config.messageFilterChain)),
        pauseTriggerChain = ???
    )
