package consumer

import io.circe.*
import io.circe.generic.semiauto.*

case class MessageFilter(
    value: String
)

given Decoder[MessageFilter] = deriveDecoder[MessageFilter]
given Encoder[MessageFilter] = deriveEncoder[MessageFilter]

enum MessageFilterChainMode:
    case All
    case Any

given Decoder[MessageFilterChainMode] = deriveDecoder[MessageFilterChainMode]
given Encoder[MessageFilterChainMode] = deriveEncoder[MessageFilterChainMode]

case class MessageFilterChain(
    mode: MessageFilterChainMode,
    filters: Map[String, MessageFilter]
)

given Decoder[MessageFilterChain] = deriveDecoder[MessageFilterChain]
given Encoder[MessageFilterChain] = deriveEncoder[MessageFilterChain]

enum SubscriptionInitialPosition:
    case Earliest
    case Latest
    
given Decoder[SubscriptionInitialPosition] = deriveDecoder[SubscriptionInitialPosition]
given Encoder[SubscriptionInitialPosition] = deriveEncoder[SubscriptionInitialPosition]

case class ConsumerSessionConfig(
    subscriptionInitialPosition: SubscriptionInitialPosition,
    messageFilterChain: MessageFilterChain
)

given Decoder[ConsumerSessionConfig] = deriveDecoder[ConsumerSessionConfig]
given Encoder[ConsumerSessionConfig] = deriveEncoder[ConsumerSessionConfig]
