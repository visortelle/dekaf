package consumer

import org.apache.pulsar.client.api.SubscriptionInitialPosition as PulsarSubscriptionInitialPosition
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

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
        case MessageFilter(_, JsMessageFilter(jsCode))  => pb.MessageFilter(value = pb.MessageFilter.Value.Js(pb.JsMessageFilter(jsCode)))
        case MessageFilter(_, BasicMessageFilter()) => pb.MessageFilter(value = pb.MessageFilter.Value.Basic(pb.BasicMessageFilter()))

def messageFilterChainModeFromPb(mode: pb.MessageFilterChainMode): MessageFilterChainMode =
    mode match
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL => MessageFilterChainMode.All
        case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY => MessageFilterChainMode.Any

def messageFilterChainModeToPb(mode: MessageFilterChainMode): pb.MessageFilterChainMode =
    mode match
        case MessageFilterChainMode.All => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL
        case MessageFilterChainMode.Any => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY

def subscriptionInitialPositionFromPb(position: pb.SubscriptionInitialPosition): SubscriptionInitialPosition =
    position match
        case pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST => SubscriptionInitialPosition.Earliest
        case pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST   => SubscriptionInitialPosition.Latest

def subscriptionInitialPositionToPb(position: SubscriptionInitialPosition): pb.SubscriptionInitialPosition =
    position match
        case SubscriptionInitialPosition.Earliest => pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST
        case SubscriptionInitialPosition.Latest   => pb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST

def subscriptionInitialPositionFromPulsar(position: PulsarSubscriptionInitialPosition): SubscriptionInitialPosition =
    position match
        case PulsarSubscriptionInitialPosition.Earliest => SubscriptionInitialPosition.Earliest
        case PulsarSubscriptionInitialPosition.Latest   => SubscriptionInitialPosition.Latest

def subscriptionInitialPositionToPulsar(position: SubscriptionInitialPosition): PulsarSubscriptionInitialPosition =
    position match
        case SubscriptionInitialPosition.Earliest => PulsarSubscriptionInitialPosition.Earliest
        case SubscriptionInitialPosition.Latest   => PulsarSubscriptionInitialPosition.Latest

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
        subscriptionInitialPosition = subscriptionInitialPositionFromPb(config.subscriptionInitialPosition.get),
        messageFilterChain = messageFilterChainFromPb(config.messageFilterChain.get)
    )

def consumerSessionConfigToPb(config: ConsumerSessionConfig): pb.ConsumerSessionConfig =
    pb.ConsumerSessionConfig(
        subscriptionInitialPosition = Some(subscriptionInitialPositionToPb(config.subscriptionInitialPosition)),
        messageFilterChain = Some(messageFilterChainToPb(config.messageFilterChain))
    )
