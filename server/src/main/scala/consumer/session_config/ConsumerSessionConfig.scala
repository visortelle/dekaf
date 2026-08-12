package consumer.session_config

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.start_from.{ConsumerSessionStartFrom, EarliestMessage}
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.value_projections.ValueProjectionList
import _root_.consumer.atProtoField

/** How a session that reads more than one DELIVERY STREAM interleaves processing across them -
  * several topics, one partitioned topic, or overlapping enabled targets on a single topic all
  * count, because each resolves to its own consumer. */
enum MessageDeliveryOrder:
    /** Every topic streams independently; messages interleave as they arrive. Fastest. */
    case AsReceived

    /** One merged stream ordered by the selected timestamp, BEST EFFORT: a bounded reorder
      * grace, worn openly - see `mergeTopicsGraceMs`. Never stalls on a silent stream, at the
      * price of admitting late messages out of order rather than dropping them. THE PRODUCT
      * DEFAULT: what UNSPECIFIED resolves to, and what a session that never named an order runs
      * under (owner decision 2026-08-09, superseding the earlier Guaranteed default).
      *
      * NOT publish-time-specific, whatever the wire constant is called: the timestamp compared is
      * whichever [[DeliveryOrderKey]] the session selected. The protobuf symbol
      * `MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME` (value 2) predates the selectable key
      * and is kept exactly as it is for wire and source compatibility - it is a name, not a
      * behavior, and renumbering or aliasing it would buy nothing and cost every saved item. */
    case BestEffort

    /** One merged stream ordered by the selected timestamp: the exact k-way merge
      * of the source logs, with NO liveness escape - a silent stream holds delivery until it
      * speaks, failed sends retry in place, nothing is ever abandoned. The session introduces
      * zero disorder of its own; only inversions already stored inside a single source log pass
      * through, in append order, counted. AN EXPLICIT CHOICE, never a fallback: an empty or idle
      * partition holds delivery indefinitely, which is the mode's whole promise - so the wait is
      * DISCLOSED (the waiting-stream count rides the stats channel and surfaces on the toolbar
      * chip) and the chip offers a one-click switch to Best effort. */
    case Guaranteed

object MessageDeliveryOrder:
    def fromPb(v: pb.MessageDeliveryOrder): MessageDeliveryOrder = v match
        case pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED                 => MessageDeliveryOrder.AsReceived
        case pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME => MessageDeliveryOrder.BestEffort
        case pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED                  => MessageDeliveryOrder.Guaranteed
        // Zero is both proto3 absence and UNSPECIFIED, including requests from older clients and
        // every config saved before the field existed. A session that never NAMED an order gets
        // the product default - Guaranteed: an exact replay of recorded history that auto-pauses
        // when caught up, with the caught-up panel offering the ways on. Owner decision
        // (2026-08-11, direct instruction), superseding the 2026-08-09 Best effort default -
        // this default has now moved twice, so the decision log in the plan file is the record.
        case pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED                 => MessageDeliveryOrder.Guaranteed
        // An old server cannot implement a future mode; use its current product default instead
        // of accidentally selecting Fastest. The explicit match keeps this distinct from zero.
        case _: pb.MessageDeliveryOrder.Unrecognized                                    => MessageDeliveryOrder.Guaranteed

    def toPb(v: MessageDeliveryOrder): pb.MessageDeliveryOrder = v match
        case MessageDeliveryOrder.AsReceived => pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED
        case MessageDeliveryOrder.BestEffort => pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME
        case MessageDeliveryOrder.Guaranteed => pb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED

/** Which per-message timestamp the delivery order compares. Not Pulsar's message ordering key. */
enum DeliveryOrderKey:
    /** Added automatically by the producer; always present. The default. */
    case PublishTime

    /** Broker entry metadata recording when an entry arrived. Present only when the broker stamps
      * and exposes that metadata; an unstamped message uses publish time and is counted. */
    case BrokerPublishTime

    /** An optional timestamp set by the application; a message carrying none (0) uses publish
      * time and is counted as a fallback. */
    case EventTime

object DeliveryOrderKey:
    def fromPb(v: pb.DeliveryOrderKey): DeliveryOrderKey = v match
        case pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_BROKER_PUBLISH_TIME => DeliveryOrderKey.BrokerPublishTime
        case pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_EVENT_TIME          => DeliveryOrderKey.EventTime
        // Zero is proto3 absence: every older client, and every config saved before the field
        // existed. Publish time is the documented default and is always present on a message.
        case pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_PUBLISH_TIME | pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_UNSPECIFIED =>
            DeliveryOrderKey.PublishTime
        // A VALUE THIS SERVER DOES NOT KNOW IS NOT THE DEFAULT. The three keys order a merged
        // session by three different clocks, so quietly answering "publish time" to a client that
        // asked for a fourth delivers a session ordered by something it never chose, with nothing
        // saying so. Unlike MessageDeliveryOrder - where the product decided an unknown value
        // resolves to the product default rather than accidentally selecting Fastest - there is no
        // safe substitute for a timestamp: it is refused. Callers at a request boundary turn this
        // into INVALID_ARGUMENT.
        case unknown: pb.DeliveryOrderKey.Unrecognized =>
            throw new IllegalArgumentException(
                s"delivery_order_key ${unknown.unrecognizedValue} is not a timestamp this server knows. " +
                    "Upgrade the server, or choose publish time, broker publish time or event time."
            )

    def toPb(v: DeliveryOrderKey): pb.DeliveryOrderKey = v match
        case DeliveryOrderKey.PublishTime       => pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_PUBLISH_TIME
        case DeliveryOrderKey.BrokerPublishTime => pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_BROKER_PUBLISH_TIME
        case DeliveryOrderKey.EventTime         => pb.DeliveryOrderKey.DELIVERY_ORDER_KEY_EVENT_TIME

case class ConsumerSessionConfig(
    startFrom: ConsumerSessionStartFrom,
    targets: Vector[ConsumerSessionTarget],
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain,
    pauseTriggerChain: ConsumerSessionPauseTriggerChain,
    valueProjectionList: ValueProjectionList,
    messageDeliveryOrder: MessageDeliveryOrder = MessageDeliveryOrder.Guaranteed,
    deliveryOrderKey: DeliveryOrderKey = DeliveryOrderKey.PublishTime
)

object ConsumerSessionConfig:
    /** EVERY FIELD IS CONVERTED UNDER ITS OWN NAME, so a malformed one is reported as a path rather
      * than as whatever the innermost conversion happened to say - see [[atProtoField]]. A session
      * with nine targets used to fail with a bare "Invalid ConsumerSessionTargetConsumptionMode
      * mode." and no way to tell which target was at fault. */
    def fromPb(v: pb.ConsumerSessionConfig): ConsumerSessionConfig =
        ConsumerSessionConfig(
            startFrom = atProtoField("start_from")(v.startFrom.map(ConsumerSessionStartFrom.fromPb).getOrElse(EarliestMessage())),
            targets = v.targets.zipWithIndex.map((target, i) => atProtoField(s"targets[$i]")(ConsumerSessionTarget.fromPb(target))).toVector,
            messageFilterChain = atProtoField("message_filter_chain")(
                v.messageFilterChain
                    .map(MessageFilterChain.fromPb)
                    .getOrElse(MessageFilterChain.empty)
            ),
            coloringRuleChain = atProtoField("coloring_rule_chain")(
                v.coloringRuleChain
                    .map(ColoringRuleChain.fromPb)
                    .getOrElse(ColoringRuleChain.empty)
            ),
            pauseTriggerChain = atProtoField("pause_trigger_chain")(
                v.pauseTriggerChain
                    .map(ConsumerSessionPauseTriggerChain.fromPb)
                    .getOrElse(ConsumerSessionPauseTriggerChain.empty)
            ),
            valueProjectionList = atProtoField("value_projection_list")(ValueProjectionList.fromPb(v.getValueProjectionList)),
            messageDeliveryOrder = atProtoField("message_delivery_order")(MessageDeliveryOrder.fromPb(v.messageDeliveryOrder)),
            deliveryOrderKey = atProtoField("delivery_order_key")(DeliveryOrderKey.fromPb(v.deliveryOrderKey))
        )

    def toPb(v: ConsumerSessionConfig): pb.ConsumerSessionConfig =
        pb.ConsumerSessionConfig(
            startFrom = Some(ConsumerSessionStartFrom.toPb(v.startFrom)),
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ColoringRuleChain.toPb(v.coloringRuleChain)),
            pauseTriggerChain = Some(
                pb.ConsumerSessionPauseTriggerChain(
                    events = Vector.empty,
                    mode = pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL
                )
            ),
            valueProjectionList = Some(ValueProjectionList.toPb(v.valueProjectionList)),
            messageDeliveryOrder = MessageDeliveryOrder.toPb(v.messageDeliveryOrder),
            deliveryOrderKey = DeliveryOrderKey.toPb(v.deliveryOrderKey)
        )
