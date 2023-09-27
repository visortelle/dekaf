package library

import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson
import _root_.consumer.{
    ConsumerSessionConfig,
    ConsumerSessionConfigPauseTrigger,
    ConsumerSessionConfigStartFrom,
    MessageFilter,
    MessageFilterChain,
    DateTime,
    EarliestMessage,
    LatestMessage,
    MessageId,
    RelativeDateTime
}

enum UserManagedItemType:
    case ConsumerSessionConfig
    case ConsumerSessionConfigStartFrom
    case ConsumerSessionConfigPauseTrigger
    case ProducerSessionConfig
    case MarkdownDocument
    case MessageFilter
    case MessageFilterChain
    case DataVisualizationWidget
    case DataVisualizationDashboard
given Decoder[UserManagedItemType] = deriveDecoder[UserManagedItemType]
given Encoder[UserManagedItemType] = deriveEncoder[UserManagedItemType]

case class UserManagedItemMetadata(
    id: String,
    name: String,
    descriptionMarkdown: String
)
given Decoder[UserManagedItemMetadata] = deriveDecoder[UserManagedItemMetadata]
given Encoder[UserManagedItemMetadata] = deriveEncoder[UserManagedItemMetadata]

type UserManagedItemReference = String

case class ValueOrReference[ValueT](
    value: Option[ValueT],
    reference: Option[UserManagedItemReference]
)
given Decoder[ValueOrReference[_]] = deriveDecoder[ValueOrReference[_]]
given Encoder[ValueOrReference[_]] = deriveEncoder[ValueOrReference[_]]

case class UserManagedConsumerSessionConfigSpec(
    startFrom: ValueOrReference[ConsumerSessionConfigStartFrom],
    messageFilterChain: ValueOrReference[MessageFilterChain],
    pauseTriggers: List[ValueOrReference[ConsumerSessionConfigPauseTrigger]]
)
given Decoder[UserManagedConsumerSessionConfigSpec] = deriveDecoder[UserManagedConsumerSessionConfigSpec]
given Encoder[UserManagedConsumerSessionConfigSpec] = deriveEncoder[UserManagedConsumerSessionConfigSpec]

case class UserManagedConsumerSessionConfig(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigSpec
)
given Decoder[UserManagedConsumerSessionConfig] = deriveDecoder[UserManagedConsumerSessionConfig]
given Encoder[UserManagedConsumerSessionConfig] = deriveEncoder[UserManagedConsumerSessionConfig]

case class UserManagedConsumerSessionConfigStartFromSpec(
                                                            earliestMessage: Option[EarliestMessage],
                                                            latestMessage: Option[LatestMessage],
                                                            messageId: Option[MessageId],
                                                            dateTime: Option[DateTime],
                                                            relativeDateTime: Option[RelativeDateTime]
)
given Decoder[UserManagedConsumerSessionConfigStartFromSpec] = deriveDecoder[UserManagedConsumerSessionConfigStartFromSpec]
given Encoder[UserManagedConsumerSessionConfigStartFromSpec] = deriveEncoder[UserManagedConsumerSessionConfigStartFromSpec]

case class UserManagedConsumerSessionConfigStartFrom(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigStartFromSpec
)
given Decoder[UserManagedConsumerSessionConfigStartFrom] = deriveDecoder[UserManagedConsumerSessionConfigStartFrom]
given Encoder[UserManagedConsumerSessionConfigStartFrom] = deriveEncoder[UserManagedConsumerSessionConfigStartFrom]

case class UserManagedConsumerSessionConfigPauseTriggerSpec(
   onMessagesProcessed: Option[Long],
   onMessagesDelivered: Option[Long],
   onBytesProcessed: Option[Long],
   onBytesDelivered: Option[Long],
   onMessageDecodeFails: Option[Long],
   onElapsedTimeMs: Option[Long],
   onTopicEndReached: Option[Boolean]
)
given Decoder[UserManagedConsumerSessionConfigPauseTriggerSpec] = deriveDecoder[UserManagedConsumerSessionConfigPauseTriggerSpec]
given Encoder[UserManagedConsumerSessionConfigPauseTriggerSpec] = deriveEncoder[UserManagedConsumerSessionConfigPauseTriggerSpec]

case class UserManagedConsumerSessionConfigPauseTrigger(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigPauseTriggerSpec
)
given Decoder[UserManagedConsumerSessionConfigPauseTrigger] = deriveDecoder[UserManagedConsumerSessionConfigPauseTrigger]
given Encoder[UserManagedConsumerSessionConfigPauseTrigger] = deriveEncoder[UserManagedConsumerSessionConfigPauseTrigger]

//case class UserManagedMessageFilter
