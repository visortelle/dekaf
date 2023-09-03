package library

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.*
import io.circe.generic.semiauto.*

case class ExactTenantMatcher(`type`: "exact-tenant-matcher", tenant: String)
given Decoder[ExactTenantMatcher] = deriveDecoder[ExactTenantMatcher]
given Encoder[ExactTenantMatcher] = deriveEncoder[ExactTenantMatcher]

case class RegexTenantMatcher(`type`: "regex-tenant-matcher", tenantRegex: String)
given Decoder[RegexTenantMatcher] = deriveDecoder[RegexTenantMatcher]
given Encoder[RegexTenantMatcher] = deriveEncoder[RegexTenantMatcher]

case class TenantMatcher(
    exactTenantMatcher: Option[ExactTenantMatcher] = None,
    regexTenantMatcher: Option[RegexTenantMatcher] = None
)
given Decoder[TenantMatcher] = deriveDecoder[TenantMatcher]
given Encoder[TenantMatcher] = deriveEncoder[TenantMatcher]

case class ExactNamespaceMatcher(`type`: "exact-namespace-matcher", tenant: TenantMatcher, namespace: String)
given Decoder[ExactNamespaceMatcher] = deriveDecoder[ExactNamespaceMatcher]
given Encoder[ExactNamespaceMatcher] = deriveEncoder[ExactNamespaceMatcher]

case class RegexNamespaceMatcher(`type`: "regex-namespace-matcher", tenant: TenantMatcher, namespaceRegex: String)
given Decoder[RegexNamespaceMatcher] = deriveDecoder[RegexNamespaceMatcher]
given Encoder[RegexNamespaceMatcher] = deriveEncoder[RegexNamespaceMatcher]

case class NamespaceMatcher(
    exactNamespaceMatcher: Option[ExactNamespaceMatcher] = None,
    regexNamespaceMatcher: Option[RegexNamespaceMatcher] = None
)
given Decoder[NamespaceMatcher] = deriveDecoder[NamespaceMatcher]
given Encoder[NamespaceMatcher] = deriveEncoder[NamespaceMatcher]

enum TopicPersistencyType:
    case NonPersistent
    case Persistent
    case Any
given Decoder[TopicPersistencyType] = deriveDecoder[TopicPersistencyType]
given Encoder[TopicPersistencyType] = deriveEncoder[TopicPersistencyType]

case class ExactTopicMatcher(
    `type`: "exact-topic-matcher",
    persistency: TopicPersistencyType,
    tenant: TenantMatcher,
    namespace: NamespaceMatcher,
    topic: String
)
given Decoder[ExactTopicMatcher] = deriveDecoder[ExactTopicMatcher]
given Encoder[ExactTopicMatcher] = deriveEncoder[ExactTopicMatcher]

case class RegexTopicMatcher(
    `type`: "regex-topic-matcher",
    persistency: TopicPersistencyType,
    tenant: TenantMatcher,
    namespace: NamespaceMatcher,
    topicRegex: String
)
given Decoder[RegexTopicMatcher] = deriveDecoder[RegexTopicMatcher]
given Encoder[RegexTopicMatcher] = deriveEncoder[RegexTopicMatcher]

case class TopicMatcher(
    exactTopicMatcher: Option[ExactTopicMatcher] = None,
    regexTopicMatcher: Option[RegexTopicMatcher] = None
)
given Decoder[TopicMatcher] = deriveDecoder[TopicMatcher]
given Encoder[TopicMatcher] = deriveEncoder[TopicMatcher]

case class ResourceMatcher(
    tenantMatcher: Option[TenantMatcher] = None,
    namespaceMatcher: Option[NamespaceMatcher] = None,
    topicMatcher: Option[TopicMatcher] = None
)
given Decoder[ResourceMatcher] = deriveDecoder[ResourceMatcher]
given Encoder[ResourceMatcher] = deriveEncoder[ResourceMatcher]

enum LibraryItemType:
    case ConsumerSessionConfig
    case ProducerSessionConfig
    case MarkdownDocument
    case MessageFilter
    case DataVisualizationWidget
    case DataVisualizationDashboard
given Decoder[LibraryItemType] = deriveDecoder[LibraryItemType]
given Encoder[LibraryItemType] = deriveEncoder[LibraryItemType]

case class LibraryItem(
    id: String,
    revision: String,
    updatedAt: Long,
    isEditable: Boolean,
    name: String,
    descriptionMarkdown: String,
    tags: List[String],
    resources: List[ResourceMatcher],
    descriptorJson: String
)
given Decoder[LibraryItem] = deriveDecoder[LibraryItem]
given Encoder[LibraryItem] = deriveEncoder[LibraryItem]
