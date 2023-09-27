package library

import com.tools.teal.pulsar.ui.library.v1.library as pb
import consumer.{
    consumerSessionConfigFromPb,
    consumerSessionConfigToPb,
    messageFilterChainFromPb,
    messageFilterChainToPb,
    messageFilterFromPb,
    messageFilterToPb,
    ConsumerSessionConfig,
    MessageFilter,
    MessageFilterChain
}

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

def libraryItemTypeFromPb(v: pb.LibraryItemType): LibraryItemType =
    v match
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG      => LibraryItemType.ConsumerSessionConfig
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_SESSION_CONFIG      => LibraryItemType.ProducerSessionConfig
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MARKDOWN_DOCUMENT            => LibraryItemType.MarkdownDocument
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER               => LibraryItemType.MessageFilter
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER_CHAIN         => LibraryItemType.MessageFilterChain
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_WIDGET    => LibraryItemType.DataVisualizationWidget
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD => LibraryItemType.DataVisualizationDashboard
        case _                                                                 => throw new IllegalArgumentException("Unknown library item type")

def libraryItemTypeToPb(v: LibraryItemType): pb.LibraryItemType =
    v match
        case LibraryItemType.ConsumerSessionConfig      => pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG
        case LibraryItemType.ProducerSessionConfig      => pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_SESSION_CONFIG
        case LibraryItemType.MarkdownDocument           => pb.LibraryItemType.LIBRARY_ITEM_TYPE_MARKDOWN_DOCUMENT
        case LibraryItemType.MessageFilter              => pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER
        case LibraryItemType.MessageFilterChain         => pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER_CHAIN
        case LibraryItemType.DataVisualizationWidget    => pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_WIDGET
        case LibraryItemType.DataVisualizationDashboard => pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD

def libraryItemFromPb(v: pb.LibraryItem): LibraryItem =
    LibraryItem(
        id = v.id,
        revision = v.revision,
        updatedAt = v.updatedAt,
        isEditable = v.isEditable,
        name = v.name,
        descriptionMarkdown = v.descriptionMarkdown,
        tags = v.tags.toList,
        resources = v.resources.map(resourceMatcherFromPb).toList,
        descriptor = libraryItemDescriptorFromPb(v.descriptor.get)
    )

def libraryItemToPb(v: LibraryItem): pb.LibraryItem =
    pb.LibraryItem(
        id = v.id,
        revision = v.revision,
        updatedAt = v.updatedAt,
        isEditable = v.isEditable,
        name = v.name,
        descriptionMarkdown = v.descriptionMarkdown,
        tags = v.tags,
        resources = v.resources.map(resourceMatcherToPb),
        descriptor = Some(libraryItemDescriptorToPb(v.descriptor))
    )

def libraryItemDescriptorFromPb(descriptor: pb.LibraryItemDescriptor): LibraryItemDescriptor = descriptor.`type` match
    case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG =>
        LibraryItemDescriptor(
            `type` = LibraryItemType.ConsumerSessionConfig,
            value = consumerSessionConfigFromPb(descriptor.value.consumerSessionConfig.get)
        )
    case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER =>
        LibraryItemDescriptor(
            `type` = LibraryItemType.MessageFilter,
            value = messageFilterFromPb(descriptor.value.messageFilter.get)
        )
    case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER_CHAIN =>
        LibraryItemDescriptor(
            `type` = LibraryItemType.MessageFilterChain,
            value = messageFilterChainFromPb(descriptor.value.messageFilterChain.get)
        )
    case _ => throw new IllegalArgumentException(s"Unknown library item type: ${descriptor.`type`}")

def libraryItemDescriptorToPb(descriptor: LibraryItemDescriptor): pb.LibraryItemDescriptor =
    descriptor.value match
        case v: ConsumerSessionConfig =>
            pb.LibraryItemDescriptor(
                `type` = libraryItemTypeToPb(LibraryItemType.ConsumerSessionConfig),
                value = pb.LibraryItemDescriptor.Value.ConsumerSessionConfig(consumerSessionConfigToPb(v))
            )
        case v: MessageFilter =>
            pb.LibraryItemDescriptor(
                `type` = libraryItemTypeToPb(LibraryItemType.MessageFilter),
                value = pb.LibraryItemDescriptor.Value.MessageFilter(messageFilterToPb(v))
            )
        case v: MessageFilterChain =>
            pb.LibraryItemDescriptor(
                `type` = libraryItemTypeToPb(LibraryItemType.MessageFilterChain),
                value = pb.LibraryItemDescriptor.Value.MessageFilterChain(messageFilterChainToPb(v))
            )
