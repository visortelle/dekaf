package consumer

import org.apache.pulsar.client.api.SubscriptionInitialPosition as PulsarSubscriptionInitialPosition
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp.Timestamp
import com.tools.teal.pulsar.ui.api.v1.consumer.BasicMessageFilter.Operation
import com.tools.teal.pulsar.ui.api.v1.consumer.BasicMessageFilterSelector.Selector as SelectorPb
import consumer.filters.{MessageFilter, MessageFilterChain, MessageFilterChainMode, MessageFilterType}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import consumer.filters.basicFilter.operations.{BasicMessageFilterOperationContains, BasicMessageFilterOperationEndsWith, BasicMessageFilterOperationEquals, BasicMessageFilterOperationGreaterThan, BasicMessageFilterOperationGreaterThanOrEquals, BasicMessageFilterOperationIsNull, BasicMessageFilterOperationIsTruthy, BasicMessageFilterOperationLessThan, BasicMessageFilterOperationLessThanOrEquals, BasicMessageFilterOperationRegex, BasicMessageFilterOperationStartsWith, BasicMessageFilterOperationUnspecified}
import consumer.filters.jsFilter.JsMessageFilter

import java.time.Instant

import com.google.protobuf.timestamp.Timestamp
import com.tools.teal.pulsar.ui.api.v1.consumer.BasicMessageFilter.Operation
import com.tools.teal.pulsar.ui.api.v1.consumer.BasicMessageFilterSelector.Selector as SelectorPb
import consumer.filters.{MessageFilter, MessageFilterChain, MessageFilterChainMode, MessageFilterType}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType, BasicMessageFilterSelector, BasicMessageFilterTarget}
import consumer.filters.basicFilter.operations.{BasicMessageFilterOperationContains, BasicMessageFilterOperationEndsWith, BasicMessageFilterOperationEquals, BasicMessageFilterOperationGreaterThan, BasicMessageFilterOperationGreaterThanOrEquals, BasicMessageFilterOperationIsNull, BasicMessageFilterOperationIsTruthy, BasicMessageFilterOperationLessThan, BasicMessageFilterOperationLessThanOrEquals, BasicMessageFilterOperationRegex, BasicMessageFilterOperationStartsWith, BasicMessageFilterOperationUnspecified}
import consumer.filters.jsFilter.JsMessageFilter

import java.time.Instant

def jsMessageFilterFromPb(filter: pb.JsMessageFilter): JsMessageFilter =
    JsMessageFilter(jsCode = filter.jsCode)
def jsMessageFilterToPb(filter: JsMessageFilter): pb.JsMessageFilter =
    pb.JsMessageFilter(jsCode = filter.jsCode)

def basicMessageFilterFromPb(filter: pb.BasicMessageFilter): BasicMessageFilter =
    val operation: BasicMessageFilterOperation = basicMessageFilterOperationFromPb(filter.operation)

    val target: BasicMessageFilterTarget = basicMessageFilterTargetFromPb(filter.target)

    val selector: Option[BasicMessageFilterSelector] = basicMessageFilterSelectorFromPb(filter.selector)

    BasicMessageFilter(
        operation = operation,
        target = target,
        selector = selector
    )

def basicMessageFilterOperationFromPb(operationPb: pb.BasicMessageFilter.Operation): BasicMessageFilterOperation =
    //escape double quotes to compare with Pulsar message as it escapes double quotes
    def escapeDoubleQuotes = (value: String) =>
        value.replace("\"", "\\" + "\"")

    // encode for inserting into js code
    def encodeValue = (value: String) =>
        java.net.URLEncoder.encode(escapeDoubleQuotes(value), "UTF-8")

    operationPb match
        case Operation.Empty => BasicMessageFilterOperationUnspecified()
        case Operation.Contains(operation) => BasicMessageFilterOperationContains(encodeValue(operation.value), operation.isCaseSensitive)
        case Operation.Equals(operation) => BasicMessageFilterOperationEquals(encodeValue(operation.value), operation.isCaseSensitive)
        case Operation.GreaterThan(operation) => BasicMessageFilterOperationGreaterThan(encodeValue(operation.value))
        case Operation.GreaterThanOrEquals(operation) => BasicMessageFilterOperationGreaterThanOrEquals(encodeValue(operation.value))
        case Operation.LessThan(operation) => BasicMessageFilterOperationLessThan(encodeValue(operation.value))
        case Operation.LessThanOrEquals(operation) => BasicMessageFilterOperationLessThanOrEquals(encodeValue(operation.value))
        case Operation.IsNull(_) => BasicMessageFilterOperationIsNull()
        case Operation.IsTruthy(_) => BasicMessageFilterOperationIsTruthy()
        case Operation.StartsWith(operation) => BasicMessageFilterOperationStartsWith(encodeValue(operation.value), operation.isCaseSensitive)
        case Operation.EndsWith(operation) => BasicMessageFilterOperationEndsWith(encodeValue(operation.value), operation.isCaseSensitive)
        case Operation.Regex(operation) => BasicMessageFilterOperationRegex(operation.value) // no need to encode regex

def basicMessageFilterOperationToPb(operation: BasicMessageFilterOperation): pb.BasicMessageFilter.Operation =
    operation match
        case BasicMessageFilterOperationUnspecified() => Operation.Empty
        case BasicMessageFilterOperationContains(value, isCaseSensitive) =>
            Operation.Contains(pb.BasicMessageFilterOperationContains(value, isCaseSensitive))
        case BasicMessageFilterOperationEquals(value, isCaseSensitive) =>
            Operation.Equals(pb.BasicMessageFilterOperationEquals(value, isCaseSensitive))
        case BasicMessageFilterOperationGreaterThan(value) =>
            Operation.GreaterThan(pb.BasicMessageFilterOperationGreaterThan(value))
        case BasicMessageFilterOperationGreaterThanOrEquals(value) =>
            Operation.GreaterThanOrEquals(pb.BasicMessageFilterOperationGreaterThanOrEquals(value))
        case BasicMessageFilterOperationLessThan(value) =>
            Operation.LessThan(pb.BasicMessageFilterOperationLessThan(value))
        case BasicMessageFilterOperationLessThanOrEquals(value) =>
            Operation.LessThanOrEquals(pb.BasicMessageFilterOperationLessThanOrEquals(value))
        case BasicMessageFilterOperationIsNull() => Operation.IsNull(pb.BasicMessageFilterOperationIsNull())
        case BasicMessageFilterOperationIsTruthy() => Operation.IsTruthy(pb.BasicMessageFilterOperationIsTruthy())
        case BasicMessageFilterOperationStartsWith(value, isCaseSensitive) =>
            Operation.StartsWith(pb.BasicMessageFilterOperationStartsWith(value, isCaseSensitive))
        case BasicMessageFilterOperationEndsWith(value, isCaseSensitive) =>
            Operation.EndsWith(pb.BasicMessageFilterOperationEndsWith(value, isCaseSensitive))
        case BasicMessageFilterOperationRegex(value) =>
            Operation.Regex(pb.BasicMessageFilterOperationRegex(value))

def basicMessageFilterSelectorFromPb(maybeSelector: Option[pb.BasicMessageFilterSelector]): Option[BasicMessageFilterSelector] =
    maybeSelector.flatMap(selector =>
        selector.selector match
            case SelectorPb.Empty => None
            case SelectorPb.Field(fieldSelectorPb: pb.BasicMessageFilterFieldSelector) =>
                Some(
                    BasicMessageFilterSelector.FieldSelector(fieldSelectorPb.fieldSelector)
                )
            case SelectorPb.Properties(propertiesSelectorPb: pb.BasicMessageFilterPropertiesSelector) =>
                val mode = basicMessageFilterPropertiesSelectorModeFromPb(propertiesSelectorPb.mode)
                Some(
                    BasicMessageFilterSelector.PropertiesSelector(propertiesSelectorPb.propertiesNames, mode)
                )
    )

def basicMessageFilterTargetFromPb(targetPb: pb.BasicMessageFilterTarget): BasicMessageFilterTarget =
    targetPb match
        case pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_UNSPECIFIED => BasicMessageFilterTarget.Unspecified
        case pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY => BasicMessageFilterTarget.Key
        case pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE => BasicMessageFilterTarget.Value
        case pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES => BasicMessageFilterTarget.Properties
        case pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM => BasicMessageFilterTarget.Accum
        case pb.BasicMessageFilterTarget.Unrecognized(_) => BasicMessageFilterTarget.Unspecified

def basicMessageFilterTargetToPb(target: BasicMessageFilterTarget): pb.BasicMessageFilterTarget =
    target match
        case BasicMessageFilterTarget.Unspecified => pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_UNSPECIFIED
        case BasicMessageFilterTarget.Key => pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY
        case BasicMessageFilterTarget.Value => pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE
        case BasicMessageFilterTarget.Properties => pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES
        case BasicMessageFilterTarget.Accum => pb.BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM

def basicMessageFilterPropertiesSelectorModeToPb(
    mode: BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode
): pb.BasicMessageFilterPropertiesSelectorMode =
    mode match
        case BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode.All =>
            pb.BasicMessageFilterPropertiesSelectorMode.BASIC_MESSAGE_FILTER_PROPERTIES_SELECTOR_MODE_ALL
        case BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode.Any =>
            pb.BasicMessageFilterPropertiesSelectorMode.BASIC_MESSAGE_FILTER_PROPERTIES_SELECTOR_MODE_ANY
        case BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode.Unspecified =>
            pb.BasicMessageFilterPropertiesSelectorMode.BASIC_MESSAGE_FILTER_PROPERTIES_SELECTOR_MODE_UNSPECIFIED

def basicMessageFilterPropertiesSelectorModeFromPb(
    mode: pb.BasicMessageFilterPropertiesSelectorMode
): BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode =
    mode match
        case pb.BasicMessageFilterPropertiesSelectorMode.BASIC_MESSAGE_FILTER_PROPERTIES_SELECTOR_MODE_ALL =>
            BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode.All
        case pb.BasicMessageFilterPropertiesSelectorMode.BASIC_MESSAGE_FILTER_PROPERTIES_SELECTOR_MODE_ANY =>
            BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode.Any
        case pb.BasicMessageFilterPropertiesSelectorMode.BASIC_MESSAGE_FILTER_PROPERTIES_SELECTOR_MODE_UNSPECIFIED =>
            BasicMessageFilterSelector.PropertiesSelector.PropertiesSelectorMode.Unspecified
def basicMessageFilterSelectorToPb(maybeSelector: Option[BasicMessageFilterSelector]): Option[pb.BasicMessageFilterSelector] =
    maybeSelector match
        case Some(selector) =>
            selector match
                case BasicMessageFilterSelector.FieldSelector(fieldSelector) =>
                    Some(
                        pb.BasicMessageFilterSelector(
                            selector =
                                SelectorPb.Field(pb.BasicMessageFilterFieldSelector(fieldSelector))
                        )
                    )
                case BasicMessageFilterSelector.PropertiesSelector(propertiesNames, mode) =>
                    val modePb = basicMessageFilterPropertiesSelectorModeToPb(mode)

                    Some(
                        pb.BasicMessageFilterSelector(
                            selector =
                                SelectorPb.Properties(pb.BasicMessageFilterPropertiesSelector(propertiesNames, modePb))
                        )
                    )
        case None => None


def basicMessageFilterToPb(filter: BasicMessageFilter): pb.BasicMessageFilter =
    pb.BasicMessageFilter(
        operation = basicMessageFilterOperationToPb(filter.operation),
        target = basicMessageFilterTargetToPb(filter.target),
        selector = basicMessageFilterSelectorToPb(filter.selector)
    )

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
        case MessageFilter(isEnabled, isNegated, _, filter: JsMessageFilter) =>
            pb.MessageFilter(
                isEnabled = isEnabled,
                isNegated = isNegated,
                value = pb.MessageFilter.Value.Js(jsMessageFilterToPb(filter))
            )
        case MessageFilter(isEnabled, isNegated, _, filter: BasicMessageFilter) =>
            pb.MessageFilter(
                isEnabled = isEnabled,
                isNegated = isNegated,
                value = pb.MessageFilter.Value.Basic(basicMessageFilterToPb(filter))
            )

def messageFilterChainModeFromPb(mode: pb.MessageFilterChainMode): MessageFilterChainMode =
    mode match
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL => MessageFilterChainMode.All
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY => MessageFilterChainMode.Any
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_UNSPECIFIED => MessageFilterChainMode.Unspecified

def messageFilterChainModeToPb(mode: MessageFilterChainMode): pb.MessageFilterChainMode =
    mode match
        case MessageFilterChainMode.All => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL
        case MessageFilterChainMode.Any => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY
        case MessageFilterChainMode.Unspecified => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_UNSPECIFIED

def dateTimeUnitFromPb(dateTimeUnit: pb.DateTimeUnit): DateTimeUnit =
    dateTimeUnit match
        case pb.DateTimeUnit.DATE_TIME_UNIT_YEAR => DateTimeUnit.Year
        case pb.DateTimeUnit.DATE_TIME_UNIT_MONTH => DateTimeUnit.Month
        case pb.DateTimeUnit.DATE_TIME_UNIT_WEEK => DateTimeUnit.Week
        case pb.DateTimeUnit.DATE_TIME_UNIT_DAY => DateTimeUnit.Day
        case pb.DateTimeUnit.DATE_TIME_UNIT_HOUR => DateTimeUnit.Hour
        case pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE => DateTimeUnit.Minute
        case pb.DateTimeUnit.DATE_TIME_UNIT_SECOND => DateTimeUnit.Second

def dateTimeUnitToPb(dateTimeUnit: DateTimeUnit): pb.DateTimeUnit =
    dateTimeUnit match
        case DateTimeUnit.Year => pb.DateTimeUnit.DATE_TIME_UNIT_YEAR
        case DateTimeUnit.Month => pb.DateTimeUnit.DATE_TIME_UNIT_MONTH
        case DateTimeUnit.Week => pb.DateTimeUnit.DATE_TIME_UNIT_WEEK
        case DateTimeUnit.Day => pb.DateTimeUnit.DATE_TIME_UNIT_DAY
        case DateTimeUnit.Hour => pb.DateTimeUnit.DATE_TIME_UNIT_HOUR
        case DateTimeUnit.Minute => pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE
        case DateTimeUnit.Second => pb.DateTimeUnit.DATE_TIME_UNIT_SECOND

def consumerSessionConfigStartFromFromPb(startFrom: pb.ConsumerSessionConfigStartFrom): ConsumerSessionConfigStartFrom =
    startFrom.value match
        case pb.ConsumerSessionConfigStartFrom.Value.EarliestMessage(_) =>
            ConsumerSessionConfigStartFrom(
                `type` = ConsumerSessionConfigStartFromType.EarliestMessage,
                value = EarliestMessage()
            )
        case pb.ConsumerSessionConfigStartFrom.Value.LatestMessage(_) =>
            ConsumerSessionConfigStartFrom(
                `type` = ConsumerSessionConfigStartFromType.LatestMessage,
                value = LatestMessage()
            )
        case pb.ConsumerSessionConfigStartFrom.Value.MessageId(v) =>
            ConsumerSessionConfigStartFrom(
                `type` = ConsumerSessionConfigStartFromType.MessageId,
                value = MessageId(messageId = v.messageId.toByteArray)
            )
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
            ConsumerSessionConfigStartFrom(
                `type` = ConsumerSessionConfigStartFromType.RelativeDateTime,
                value = relativeDateTime
            )

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
