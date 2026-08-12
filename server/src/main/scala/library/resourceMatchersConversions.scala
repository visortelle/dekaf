package library

import com.tools.teal.pulsar.ui.library.v1.resource_matchers as pb

def instanceMatcherFromPb(v: pb.InstanceMatcher): InstanceMatcher =
    InstanceMatcher()

def instanceMatcherToPb(v: InstanceMatcher): pb.InstanceMatcher =
    pb.InstanceMatcher()

def exactTenantMatcherFromPb(v: pb.ExactTenantMatcher): ExactTenantMatcher =
    ExactTenantMatcher(tenant = v.tenant)

def exactTenantMatcherToPb(v: ExactTenantMatcher): pb.ExactTenantMatcher =
    pb.ExactTenantMatcher(tenant = v.tenant)

def allTenantMatcherFromPb(v: pb.AllTenantMatcher): AllTenantMatcher =
    AllTenantMatcher()

def allTenantMatcherToPb(v: AllTenantMatcher): pb.AllTenantMatcher =
    pb.AllTenantMatcher()

def tenantMatcherFromPb(v: pb.TenantMatcher): TenantMatcher =
    v.matcher match
        case pb.TenantMatcher.Matcher.Exact(exactTenantMatcher) => TenantMatcher(matcher = exactTenantMatcherFromPb(exactTenantMatcher))
        case pb.TenantMatcher.Matcher.All(allTenantMatcher)     => TenantMatcher(matcher = allTenantMatcherFromPb(allTenantMatcher))
        case _                                                  => throw new IllegalArgumentException("Unknown matcher type")

def tenantMatcherToPb(v: TenantMatcher): pb.TenantMatcher =
    v.matcher match
        case v: ExactTenantMatcher =>
            pb.TenantMatcher(matcher = pb.TenantMatcher.Matcher.Exact(exactTenantMatcherToPb(v)))
        case v: AllTenantMatcher =>
            pb.TenantMatcher(matcher = pb.TenantMatcher.Matcher.All(allTenantMatcherToPb(v)))

/** Nested matcher messages are proto3 optional, so an older/partial client can leave them unset.
  * `.get` turned that into NoSuchElementException, which LibraryServiceImpl maps to INTERNAL (a
  * 500 for a client-side mistake); IllegalArgumentException is the INVALID_ARGUMENT channel used
  * by the oneof guards in this same file. */
private def required[A](field: Option[A], name: String): A =
    field.getOrElse(throw new IllegalArgumentException(s"Missing required field: $name"))

def exactNamespaceMatcherFromPb(v: pb.ExactNamespaceMatcher): ExactNamespaceMatcher =
    ExactNamespaceMatcher(tenant = tenantMatcherFromPb(required(v.tenant, "ExactNamespaceMatcher.tenant")), namespace = v.namespace)

def exactNamespaceMatcherToPb(v: ExactNamespaceMatcher): pb.ExactNamespaceMatcher =
    pb.ExactNamespaceMatcher(tenant = Some(tenantMatcherToPb(v.tenant)), namespace = v.namespace)

/** `AllNamespaceMatcher.namespace_regex` (proto field 2) is NOT implemented, and the model has no
  * field for it - "all namespaces of a matching tenant" is the whole meaning of this matcher.
  *
  * It stays unimplemented deliberately rather than by oversight: `test` compares one MATCHER against
  * another, not a matcher against a concrete namespace, so an AllNamespaceMatcher tested against
  * another AllNamespaceMatcher would have to decide whether one regex subsumes another - undecidable
  * in general. There is no honest semantics to give it for that case.
  *
  * So a set regex is REFUSED. Accepting it and dropping it returned a matcher covering every
  * namespace of the tenant to a caller that asked for a subset - success plus a silently WIDER
  * access scope. A server-side warning does not reach that caller; only an error does.
  * IllegalArgumentException is the INVALID_ARGUMENT channel used by the other malformed-input guards
  * in this file. An UNSET regex (the proto default) still converts, so every stored item and every
  * request the UI makes are untouched - nothing writes the field.
  *
  * The refusal is for REQUEST data only. For items already ON DISK it made the whole item vanish
  * from the library, so the scan strips a set regex before converting - see
  * `resourceMatcherWithoutNamespaceRegex` below.
  */
def allNamespaceMatcherFromPb(v: pb.AllNamespaceMatcher): AllNamespaceMatcher =
    if v.namespaceRegex.nonEmpty then
        throw new IllegalArgumentException(
            s"AllNamespaceMatcher.namespace_regex is not implemented (got '${v.namespaceRegex}'). " +
                "This matcher covers EVERY namespace of the matching tenant; use ExactNamespaceMatcher to narrow the scope."
        )
    AllNamespaceMatcher(tenant = tenantMatcherFromPb(required(v.tenant, "AllNamespaceMatcher.tenant")))

def allNamespaceMatcherToPb(v: AllNamespaceMatcher): pb.AllNamespaceMatcher =
    pb.AllNamespaceMatcher(tenant = Some(tenantMatcherToPb(v.tenant)))

def namespaceMatcherFromPb(v: pb.NamespaceMatcher): NamespaceMatcher =
    v.matcher match
        case pb.NamespaceMatcher.Matcher.Exact(exactNamespaceMatcher) =>
            NamespaceMatcher(matcher = exactNamespaceMatcherFromPb(exactNamespaceMatcher))
        case pb.NamespaceMatcher.Matcher.All(allNamespaceMatcher) =>
            NamespaceMatcher(matcher = allNamespaceMatcherFromPb(allNamespaceMatcher))
        case _ => throw new IllegalArgumentException("Unknown matcher type")

def namespaceMatcherToPb(v: NamespaceMatcher): pb.NamespaceMatcher =
    v.matcher match
        case v: ExactNamespaceMatcher =>
            pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.Exact(exactNamespaceMatcherToPb(v)))
        case v: AllNamespaceMatcher =>
            pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.All(allNamespaceMatcherToPb(v)))

def exactTopicMatcherFromPb(v: pb.ExactTopicMatcher): ExactTopicMatcher =
    ExactTopicMatcher(
        namespace = namespaceMatcherFromPb(required(v.namespace, "ExactTopicMatcher.namespace")),
        topic = v.topic
    )

def exactTopicMatcherToPb(v: ExactTopicMatcher): pb.ExactTopicMatcher =
    pb.ExactTopicMatcher(
        namespace = Some(namespaceMatcherToPb(v.namespace)),
        topic = v.topic
    )

def allTopicMatcherFromPb(v: pb.AllTopicMatcher): AllTopicMatcher =
    AllTopicMatcher(
        namespace = namespaceMatcherFromPb(required(v.namespace, "AllTopicMatcher.namespace"))
    )

def allTopicMatcherToPb(v: AllTopicMatcher): pb.AllTopicMatcher =
    pb.AllTopicMatcher(
        namespace = Some(namespaceMatcherToPb(v.namespace))
    )

def topicMatcherFromPb(v: pb.TopicMatcher): TopicMatcher =
    v.matcher match
        case pb.TopicMatcher.Matcher.Exact(exactTopicMatcher) => TopicMatcher(matcher = exactTopicMatcherFromPb(exactTopicMatcher))
        case pb.TopicMatcher.Matcher.All(allTopicMatcher)     => TopicMatcher(matcher = allTopicMatcherFromPb(allTopicMatcher))
        case _                                                => throw new IllegalArgumentException("Unknown matcher type")

def topicMatcherToPb(v: TopicMatcher): pb.TopicMatcher =
    v.matcher match
        case v: ExactTopicMatcher => pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.Exact(exactTopicMatcherToPb(v)))
        case v: AllTopicMatcher   => pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.All(allTopicMatcherToPb(v)))

def resourceMatcherFromPb(v: pb.ResourceMatcher): ResourceMatcher =
    v.matcher match
        case pb.ResourceMatcher.Matcher.Instance(instanceMatcher) => ResourceMatcher(matcher = instanceMatcherFromPb(instanceMatcher))
        case pb.ResourceMatcher.Matcher.Tenant(tenantMatcher)     => ResourceMatcher(matcher = tenantMatcherFromPb(tenantMatcher))
        case pb.ResourceMatcher.Matcher.Namespace(namespace)      => ResourceMatcher(matcher = namespaceMatcherFromPb(namespace))
        case pb.ResourceMatcher.Matcher.Topic(topicMatcher)       => ResourceMatcher(matcher = topicMatcherFromPb(topicMatcher))
        case _                                                    => throw new IllegalArgumentException("Unknown matcher type")

def resourceMatcherToPb(v: ResourceMatcher): pb.ResourceMatcher =
    v.matcher match
        case v: InstanceMatcher =>
            pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Instance(instanceMatcherToPb(v)))
        case v: TenantMatcher =>
            pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Tenant(tenantMatcherToPb(v)))
        case v: NamespaceMatcher =>
            pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Namespace(namespaceMatcherToPb(v)))
        case v: TopicMatcher =>
            pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Topic(topicMatcherToPb(v)))

/** READ-path counterpart to the refusal in `allNamespaceMatcherFromPb`: return `v` with any SET
  * `AllNamespaceMatcher.namespace_regex` cleared, reporting each dropped pattern via `onDrop`.
  *
  * A REQUEST carrying the unimplemented field must be refused - accepting it would silently widen
  * the caller's scope. A STORED item is different: refusing it on the scan path made the whole
  * item fail to parse and vanish from the library, with only a server-side WARN and no way to
  * repair it through the product. Dropping the FIELD (never applied by any version that wrote it)
  * keeps the item loadable and addressable, and `onDrop` lets the caller name the item and the
  * ignored pattern. The field nests in two places: directly under a namespace matcher, and under
  * the namespace of either topic matcher variant.
  */
def resourceMatcherWithoutNamespaceRegex(v: pb.ResourceMatcher, onDrop: String => Unit): pb.ResourceMatcher =
    def cleanNamespace(ns: pb.NamespaceMatcher): pb.NamespaceMatcher =
        ns.matcher match
            case pb.NamespaceMatcher.Matcher.All(all) if all.namespaceRegex.nonEmpty =>
                onDrop(all.namespaceRegex)
                ns.copy(matcher = pb.NamespaceMatcher.Matcher.All(all.copy(namespaceRegex = "")))
            case _ => ns

    v.matcher match
        case pb.ResourceMatcher.Matcher.Namespace(ns) =>
            v.copy(matcher = pb.ResourceMatcher.Matcher.Namespace(cleanNamespace(ns)))
        case pb.ResourceMatcher.Matcher.Topic(topic) =>
            val cleaned = topic.matcher match
                case pb.TopicMatcher.Matcher.Exact(exact) =>
                    topic.copy(matcher = pb.TopicMatcher.Matcher.Exact(exact.copy(namespace = exact.namespace.map(cleanNamespace))))
                case pb.TopicMatcher.Matcher.All(all) =>
                    topic.copy(matcher = pb.TopicMatcher.Matcher.All(all.copy(namespace = all.namespace.map(cleanNamespace))))
                case _ => topic
            v.copy(matcher = pb.ResourceMatcher.Matcher.Topic(cleaned))
        case _ => v
