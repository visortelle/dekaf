package library

import com.tools.teal.pulsar.ui.library.v1.resource_matchers as pb

def exactTenantMatcherFromPb(v: pb.ExactTenantMatcher): ExactTenantMatcher =
    ExactTenantMatcher(`type` = "exact-tenant-matcher", tenant = v.tenant)

def exactTenantMatcherToPb(v: ExactTenantMatcher): pb.ExactTenantMatcher =
    pb.ExactTenantMatcher(tenant = v.tenant)

def regexTenantMatcherFromPb(v: pb.RegexTenantMatcher): RegexTenantMatcher =
    RegexTenantMatcher(`type` = "regex-tenant-matcher", tenantRegex = v.tenantRegex)

def regexTenantMatcherToPb(v: RegexTenantMatcher): pb.RegexTenantMatcher =
    pb.RegexTenantMatcher(tenantRegex = v.tenantRegex)

def tenantMatcherFromPb(v: pb.TenantMatcher): TenantMatcher =
    v.matcher match
        case pb.TenantMatcher.Matcher.Exact(exactTenantMatcher) => TenantMatcher(exactTenantMatcher = Some(exactTenantMatcherFromPb(exactTenantMatcher)))
        case pb.TenantMatcher.Matcher.Regex(regexTenantMatcher) => TenantMatcher(regexTenantMatcher = Some(regexTenantMatcherFromPb(regexTenantMatcher)))
        case _                                                  => throw new IllegalArgumentException("Unknown matcher type")

def tenantMatcherToPb(v: TenantMatcher): pb.TenantMatcher =
    v match
        case TenantMatcher(Some(exactTenantMatcher), None) =>
            pb.TenantMatcher(matcher = pb.TenantMatcher.Matcher.Exact(exactTenantMatcherToPb(exactTenantMatcher)))
        case TenantMatcher(None, Some(regexTenantMatcher)) =>
            pb.TenantMatcher(matcher = pb.TenantMatcher.Matcher.Regex(regexTenantMatcherToPb(regexTenantMatcher)))
        case _ => throw new IllegalArgumentException("Unknown matcher type")

def exactNamespaceMatcherFromPb(v: pb.ExactNamespaceMatcher): ExactNamespaceMatcher =
    ExactNamespaceMatcher(`type` = "exact-namespace-matcher", tenant = tenantMatcherFromPb(v.tenant.get), namespace = v.namespace)

def exactNamespaceMatcherToPb(v: ExactNamespaceMatcher): pb.ExactNamespaceMatcher =
    pb.ExactNamespaceMatcher(tenant = Some(tenantMatcherToPb(v.tenant)), namespace = v.namespace)

def regexNamespaceMatcherFromPb(v: pb.RegexNamespaceMatcher): RegexNamespaceMatcher =
    RegexNamespaceMatcher(`type` = "regex-namespace-matcher", tenant = tenantMatcherFromPb(v.tenant.get), namespaceRegex = v.namespaceRegex)

def regexNamespaceMatcherToPb(v: RegexNamespaceMatcher): pb.RegexNamespaceMatcher =
    pb.RegexNamespaceMatcher(tenant = Some(tenantMatcherToPb(v.tenant)), namespaceRegex = v.namespaceRegex)

def namespaceMatcherFromPb(v: pb.NamespaceMatcher): NamespaceMatcher =
    v.matcher match
        case pb.NamespaceMatcher.Matcher.Exact(exactNamespaceMatcher) =>
            NamespaceMatcher(exactNamespaceMatcher = Some(exactNamespaceMatcherFromPb(exactNamespaceMatcher)))
        case pb.NamespaceMatcher.Matcher.Regex(regexNamespaceMatcher) =>
            NamespaceMatcher(regexNamespaceMatcher = Some(regexNamespaceMatcherFromPb(regexNamespaceMatcher)))
        case _ => throw new IllegalArgumentException("Unknown matcher type")

def namespaceMatcherToPb(v: NamespaceMatcher): pb.NamespaceMatcher =
    v match
        case NamespaceMatcher(Some(exactNamespaceMatcher), None) =>
            pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.Exact(exactNamespaceMatcherToPb(exactNamespaceMatcher)))
        case NamespaceMatcher(None, Some(regexNamespaceMatcher)) =>
            pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.Regex(regexNamespaceMatcherToPb(regexNamespaceMatcher)))
        case _ => throw new IllegalArgumentException("Unknown matcher type")

def topicPersistencyFromPb(v: pb.TopicPersistency): TopicPersistency =
    v match
        case pb.TopicPersistency.TOPIC_PERSISTENCY_NON_PERSISTENT => TopicPersistency.NonPersistent
        case pb.TopicPersistency.TOPIC_PERSISTENCY_PERSISTENT     => TopicPersistency.Persistent
        case pb.TopicPersistency.TOPIC_PERSISTENCY_ANY            => TopicPersistency.Any
        case _                                                    => throw new IllegalArgumentException("Unknown topic persistency type")

def topicPersistencyToPb(v: TopicPersistency): pb.TopicPersistency =
    v match
        case TopicPersistency.NonPersistent => pb.TopicPersistency.TOPIC_PERSISTENCY_NON_PERSISTENT
        case TopicPersistency.Persistent    => pb.TopicPersistency.TOPIC_PERSISTENCY_PERSISTENT
        case TopicPersistency.Any           => pb.TopicPersistency.TOPIC_PERSISTENCY_ANY

def exactTopicMatcherFromPb(v: pb.ExactTopicMatcher): ExactTopicMatcher =
    ExactTopicMatcher(
        `type` = "exact-topic-matcher",
        persistency = topicPersistencyFromPb(v.persistency),
        namespace = namespaceMatcherFromPb(v.namespace.get),
        topic = v.topic
    )

def exactTopicMatcherToPb(v: ExactTopicMatcher): pb.ExactTopicMatcher =
    pb.ExactTopicMatcher(
        persistency = topicPersistencyToPb(v.persistency),
        namespace = Some(namespaceMatcherToPb(v.namespace)),
        topic = v.topic
    )

def regexTopicMatcherFromPb(v: pb.RegexTopicMatcher): RegexTopicMatcher =
    RegexTopicMatcher(
        `type` = "regex-topic-matcher",
        persistency = topicPersistencyFromPb(v.persistency),
        namespace = namespaceMatcherFromPb(v.namespace.get),
        topicRegex = v.topicRegex
    )

def regexTopicMatcherToPb(v: RegexTopicMatcher): pb.RegexTopicMatcher =
    pb.RegexTopicMatcher(
        persistency = topicPersistencyToPb(v.persistency),
        namespace = Some(namespaceMatcherToPb(v.namespace)),
        topicRegex = v.topicRegex
    )

def topicMatcherFromPb(v: pb.TopicMatcher): TopicMatcher =
    v.matcher match
        case pb.TopicMatcher.Matcher.Exact(exactTopicMatcher) => TopicMatcher(exactTopicMatcher = Some(exactTopicMatcherFromPb(exactTopicMatcher)))
        case pb.TopicMatcher.Matcher.Regex(regexTopicMatcher) => TopicMatcher(regexTopicMatcher = Some(regexTopicMatcherFromPb(regexTopicMatcher)))
        case _                                                => throw new IllegalArgumentException("Unknown matcher type")

def topicMatcherToPb(v: TopicMatcher): pb.TopicMatcher =
    v match
        case TopicMatcher(Some(exactTopicMatcher), None) => pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.Exact(exactTopicMatcherToPb(exactTopicMatcher)))
        case TopicMatcher(None, Some(regexTopicMatcher)) => pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.Regex(regexTopicMatcherToPb(regexTopicMatcher)))
        case _                                           => throw new IllegalArgumentException("Unknown matcher type")

def resourceMatcherFromPb(v: pb.ResourceMatcher): ResourceMatcher =
    v.matcher match
        case pb.ResourceMatcher.Matcher.Tenant(tenantMatcher) => ResourceMatcher(tenantMatcher = Some(tenantMatcherFromPb(tenantMatcher)))
        case pb.ResourceMatcher.Matcher.Namespace(namespace)  => ResourceMatcher(namespaceMatcher = Some(namespaceMatcherFromPb(namespace)))
        case pb.ResourceMatcher.Matcher.Topic(topicMatcher)   => ResourceMatcher(topicMatcher = Some(topicMatcherFromPb(topicMatcher)))
        case _                                                => throw new IllegalArgumentException("Unknown matcher type")

def resourceMatcherToPb(v: ResourceMatcher): pb.ResourceMatcher =
    v match
        case ResourceMatcher(Some(tenantMatcher), None, None) =>
            pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Tenant(tenantMatcherToPb(tenantMatcher)))
        case ResourceMatcher(None, Some(namespaceMatcher), None) =>
            pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Namespace(namespaceMatcherToPb(namespaceMatcher)))
        case ResourceMatcher(None, None, Some(topicMatcher)) => pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Topic(topicMatcherToPb(topicMatcher)))
        case _                                               => throw new IllegalArgumentException("Unknown matcher type")
