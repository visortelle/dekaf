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

def exactNamespaceMatcherFromPb(v: pb.ExactNamespaceMatcher): ExactNamespaceMatcher =
    ExactNamespaceMatcher(tenant = tenantMatcherFromPb(v.tenant.get), namespace = v.namespace)

def exactNamespaceMatcherToPb(v: ExactNamespaceMatcher): pb.ExactNamespaceMatcher =
    pb.ExactNamespaceMatcher(tenant = Some(tenantMatcherToPb(v.tenant)), namespace = v.namespace)

def allNamespaceMatcherFromPb(v: pb.AllNamespaceMatcher): AllNamespaceMatcher =
    AllNamespaceMatcher(tenant = tenantMatcherFromPb(v.tenant.get))

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
        namespace = namespaceMatcherFromPb(v.namespace.get),
        topic = v.topic
    )

def exactTopicMatcherToPb(v: ExactTopicMatcher): pb.ExactTopicMatcher =
    pb.ExactTopicMatcher(
        namespace = Some(namespaceMatcherToPb(v.namespace)),
        topic = v.topic
    )

def allTopicMatcherFromPb(v: pb.AllTopicMatcher): AllTopicMatcher =
    AllTopicMatcher(
        namespace = namespaceMatcherFromPb(v.namespace.get)
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
