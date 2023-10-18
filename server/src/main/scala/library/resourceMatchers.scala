package library

import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.*
import io.circe.generic.semiauto.*

case class ExactTenantMatcher(`type`: "exact-tenant-matcher", tenant: String)
given Decoder[ExactTenantMatcher] = deriveDecoder[ExactTenantMatcher]
given Encoder[ExactTenantMatcher] = deriveEncoder[ExactTenantMatcher]

object ExactTenantMatcher:
    def test(matcher: ExactTenantMatcher, tenantFqn: String): Boolean = matcher.tenant == tenantFqn

case class RegexTenantMatcher(`type`: "regex-tenant-matcher", tenantRegex: String)
given Decoder[RegexTenantMatcher] = deriveDecoder[RegexTenantMatcher]
given Encoder[RegexTenantMatcher] = deriveEncoder[RegexTenantMatcher]

object RegexTenantMatcher:
    def test(matcher: RegexTenantMatcher, tenantFqn: String): Boolean = tenantFqn.matches(matcher.tenantRegex)

case class TenantMatcher(
    exactTenantMatcher: Option[ExactTenantMatcher] = None,
    regexTenantMatcher: Option[RegexTenantMatcher] = None
)
given Decoder[TenantMatcher] = deriveDecoder[TenantMatcher]
given Encoder[TenantMatcher] = deriveEncoder[TenantMatcher]

object TenantMatcher:
    def test(matcher: TenantMatcher, tenantFqn: String): Boolean =
        matcher.exactTenantMatcher.exists(ExactTenantMatcher.test(_, tenantFqn)) ||
            matcher.regexTenantMatcher.exists(RegexTenantMatcher.test(_, tenantFqn))

case class ExactNamespaceMatcher(`type`: "exact-namespace-matcher", tenant: TenantMatcher, namespace: String)
given Decoder[ExactNamespaceMatcher] = deriveDecoder[ExactNamespaceMatcher]
given Encoder[ExactNamespaceMatcher] = deriveEncoder[ExactNamespaceMatcher]

object ExactNamespaceMatcher:
    def test(matcher: ExactNamespaceMatcher, namespaceFqn: String): Boolean =
        val Array(tenant, namespace) = namespaceFqn.split("/")
        TenantMatcher.test(matcher.tenant, tenant) && matcher.namespace == namespace

case class RegexNamespaceMatcher(`type`: "regex-namespace-matcher", tenant: TenantMatcher, namespaceRegex: String)
given Decoder[RegexNamespaceMatcher] = deriveDecoder[RegexNamespaceMatcher]
given Encoder[RegexNamespaceMatcher] = deriveEncoder[RegexNamespaceMatcher]

object RegexNamespaceMatcher:
    def test(matcher: RegexNamespaceMatcher, namespaceFqn: String): Boolean =
        val Array(tenant, namespace) = namespaceFqn.split("/")
        TenantMatcher.test(matcher.tenant, tenant) && namespace.matches(matcher.namespaceRegex)

case class NamespaceMatcher(
    exactNamespaceMatcher: Option[ExactNamespaceMatcher] = None,
    regexNamespaceMatcher: Option[RegexNamespaceMatcher] = None
)
given Decoder[NamespaceMatcher] = deriveDecoder[NamespaceMatcher]
given Encoder[NamespaceMatcher] = deriveEncoder[NamespaceMatcher]

object NamespaceMatcher:
    def test(matcher: NamespaceMatcher, namespaceFqn: String): Boolean =
        matcher.exactNamespaceMatcher.exists(ExactNamespaceMatcher.test(_, namespaceFqn)) ||
            matcher.regexNamespaceMatcher.exists(RegexNamespaceMatcher.test(_, namespaceFqn))

enum TopicPersistency:
    case NonPersistent
    case Persistent
    case Any
given Decoder[TopicPersistency] = deriveDecoder[TopicPersistency]
given Encoder[TopicPersistency] = deriveEncoder[TopicPersistency]

object TopicPersistency:
    def testTopicFqn(want: TopicPersistency, topicFqn: String): Boolean =
        val Array(persistencyType, _) = topicFqn.split("://")
        want match
            case TopicPersistency.Any => true
            case TopicPersistency.NonPersistent => persistencyType == "non-persistent"
            case TopicPersistency.Persistent => persistencyType == "persistent"

case class ExactTopicMatcher(
    `type`: "exact-topic-matcher",
    persistency: TopicPersistency,
    namespace: NamespaceMatcher,
    topic: String
)
given Decoder[ExactTopicMatcher] = deriveDecoder[ExactTopicMatcher]
given Encoder[ExactTopicMatcher] = deriveEncoder[ExactTopicMatcher]

object ExactTopicMatcher:
    def test(matcher: ExactTopicMatcher, topicFqn: String): Boolean =
        val Array(_, restFqn) = topicFqn.split("://")
        val Array(tenant, namespace, topic) = restFqn.split("/")
        val namespaceFqn = s"$tenant/$namespace"

        NamespaceMatcher.test(matcher.namespace, namespaceFqn) &&
            TopicPersistency.testTopicFqn(matcher.persistency, topicFqn) &&
            matcher.topic == topic

case class RegexTopicMatcher(
    `type`: "regex-topic-matcher",
    persistency: TopicPersistency,
    namespace: NamespaceMatcher,
    topicRegex: String
)
given Decoder[RegexTopicMatcher] = deriveDecoder[RegexTopicMatcher]
given Encoder[RegexTopicMatcher] = deriveEncoder[RegexTopicMatcher]

object RegexTopicMatcher:
    def test(matcher: RegexTopicMatcher, topicFqn: String): Boolean =
        val Array(_, restFqn) = topicFqn.split("://")
        val Array(tenant, namespace, topic) = restFqn.split("/")
        val namespaceFqn = s"$tenant/$namespace"

        NamespaceMatcher.test(matcher.namespace, namespaceFqn) &&
            TopicPersistency.testTopicFqn(matcher.persistency, topicFqn) &&
            topic.matches(matcher.topicRegex)

case class TopicMatcher(
    exactTopicMatcher: Option[ExactTopicMatcher] = None,
    regexTopicMatcher: Option[RegexTopicMatcher] = None
)
given Decoder[TopicMatcher] = deriveDecoder[TopicMatcher]
given Encoder[TopicMatcher] = deriveEncoder[TopicMatcher]

object TopicMatcher:
    def test(matcher: TopicMatcher, topicFqn: String): Boolean =
        matcher.exactTopicMatcher.exists(ExactTopicMatcher.test(_, topicFqn)) ||
            matcher.regexTopicMatcher.exists(RegexTopicMatcher.test(_, topicFqn))

case class ResourceMatcher(
    tenantMatcher: Option[TenantMatcher] = None,
    namespaceMatcher: Option[NamespaceMatcher] = None,
    topicMatcher: Option[TopicMatcher] = None
)
given Decoder[ResourceMatcher] = deriveDecoder[ResourceMatcher]
given Encoder[ResourceMatcher] = deriveEncoder[ResourceMatcher]

enum ResourceType:
    case Tenant
    case Namespace
    case Topic

object ResourceType:
    def determine(resourceFqn: String): ResourceType =
        val Array(_, restFqn) = resourceFqn.split("://")
        val Array(_, namespace, topic) = restFqn.split("/")
        if topic.isEmpty then
            if namespace.isEmpty then
                ResourceType.Tenant
            else
                ResourceType.Namespace
        else
            ResourceType.Topic

object ResourceMatcher:
    def test(matcher: ResourceMatcher, resourceFqn: String): Boolean =
        val resourceType = ResourceType.determine(resourceFqn)
        resourceType match
            case ResourceType.Tenant => matcher.tenantMatcher.exists(TenantMatcher.test(_, resourceFqn))
            case ResourceType.Namespace => matcher.namespaceMatcher.exists(NamespaceMatcher.test(_, resourceFqn))
            case ResourceType.Topic => matcher.topicMatcher.exists(TopicMatcher.test(_, resourceFqn))
