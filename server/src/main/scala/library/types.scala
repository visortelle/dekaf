package library

case class ExactTenantMatcher(`type`: "exact-tenant-matcher", tenant: String)
case class RegexTenantMatcher(`type`: "regex-tenant-matcher", tenantRegex: String)
case class TenantMatcher(matcher: ExactTenantMatcher | RegexTenantMatcher)

case class ExactNamespaceMatcher(`type`: "exact-namespace-matcher", tenant: TenantMatcher, namespace: String)
case class RegexNamespaceMatcher(`type`: "regex-namespace-matcher", tenant: TenantMatcher, namespaceRegex: String)
case class NamespaceMatcher(matcher: ExactNamespaceMatcher | RegexNamespaceMatcher)

type TopicPersistencyType = "persistent" | "non-persistent" | "any"

case class ExactTopicMatcher(
    `type`: "exact-topic-matcher",
    persistency: TopicPersistencyType,
    tenant: TenantMatcher,
    namespace: NamespaceMatcher,
    topic: String
)
case class RegexTopicMatcher(
    `type`: "regex-topic-matcher",
    persistency: TopicPersistencyType,
    tenant: TenantMatcher,
    namespace: NamespaceMatcher,
    topicRegex: String
)
case class TopicMatcher(matcher: ExactTopicMatcher | RegexTopicMatcher)

case class ResourceMatcher(matcher: TenantMatcher | NamespaceMatcher | TopicMatcher)

type LibraryItemType =
    "consumer-session-config" | "producer-session-config" | "markdown-document" | "message-filter" | "data-visualization-widget" |
        "data-visualization-dashboard"

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
