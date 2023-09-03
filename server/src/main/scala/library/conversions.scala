package library

import com.tools.teal.pulsar.ui.library.v1.library as pb

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
        case pb.TenantMatcher.Matcher.Exact(exactTenantMatcher) => TenantMatcher(matcher = exactTenantMatcherFromPb(exactTenantMatcher))
        case pb.TenantMatcher.Matcher.Regex(regexTenantMatcher) => TenantMatcher(matcher = regexTenantMatcherFromPb(regexTenantMatcher))
        case _                                                  => throw new IllegalArgumentException("Unknown matcher type")

def tenantMatcherToPb(v: TenantMatcher): pb.TenantMatcher =
    v.matcher match
        case exactTenantMatcher: ExactTenantMatcher => pb.TenantMatcher(matcher = pb.TenantMatcher.Matcher.Exact(exactTenantMatcherToPb(exactTenantMatcher)))
        case regexTenantMatcher: RegexTenantMatcher => pb.TenantMatcher(matcher = pb.TenantMatcher.Matcher.Regex(regexTenantMatcherToPb(regexTenantMatcher)))

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
        case pb.NamespaceMatcher.Matcher.Exact(exactNamespaceMatcher) => NamespaceMatcher(matcher = exactNamespaceMatcherFromPb(exactNamespaceMatcher))
        case pb.NamespaceMatcher.Matcher.Regex(regexNamespaceMatcher) => NamespaceMatcher(matcher = regexNamespaceMatcherFromPb(regexNamespaceMatcher))
        case _                                                        => throw new IllegalArgumentException("Unknown matcher type")

def namespaceMatcherToPb(v: NamespaceMatcher): pb.NamespaceMatcher =
    v.matcher match
        case exactNamespaceMatcher: ExactNamespaceMatcher =>
            pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.Exact(exactNamespaceMatcherToPb(exactNamespaceMatcher)))
        case regexNamespaceMatcher: RegexNamespaceMatcher =>
            pb.NamespaceMatcher(matcher = pb.NamespaceMatcher.Matcher.Regex(regexNamespaceMatcherToPb(regexNamespaceMatcher)))

def topicPersistencyTypeFromPb(v: pb.TopicPersistencyType): TopicPersistencyType =
    v match
        case pb.TopicPersistencyType.TOPIC_PERSISTENCY_TYPE_NON_PERSISTENT => "non-persistent"
        case pb.TopicPersistencyType.TOPIC_PERSISTENCY_TYPE_PERSISTENT     => "persistent"
        case pb.TopicPersistencyType.TOPIC_PERSISTENCY_TYPE_ANY            => "any"
        case _                                                             => throw new IllegalArgumentException("Unknown topic persistency type")

def topicPersistencyTypeToPb(v: TopicPersistencyType): pb.TopicPersistencyType =
    v match
        case "non-persistent" => pb.TopicPersistencyType.TOPIC_PERSISTENCY_TYPE_NON_PERSISTENT
        case "persistent"     => pb.TopicPersistencyType.TOPIC_PERSISTENCY_TYPE_PERSISTENT
        case "any"            => pb.TopicPersistencyType.TOPIC_PERSISTENCY_TYPE_ANY

def exactTopicMatcherFromPb(v: pb.ExactTopicMatcher): ExactTopicMatcher =
    ExactTopicMatcher(
        `type` = "exact-topic-matcher",
        persistency = topicPersistencyTypeFromPb(v.persistency),
        tenant = tenantMatcherFromPb(v.tenant.get),
        namespace = namespaceMatcherFromPb(v.namespace.get),
        topic = v.topic
    )

def exactTopicMatcherToPb(v: ExactTopicMatcher): pb.ExactTopicMatcher =
    pb.ExactTopicMatcher(
        persistency = topicPersistencyTypeToPb(v.persistency),
        tenant = Some(tenantMatcherToPb(v.tenant)),
        namespace = Some(namespaceMatcherToPb(v.namespace)),
        topic = v.topic
    )

def regexTopicMatcherFromPb(v: pb.RegexTopicMatcher): RegexTopicMatcher =
    RegexTopicMatcher(
        `type` = "regex-topic-matcher",
        persistency = topicPersistencyTypeFromPb(v.persistency),
        tenant = tenantMatcherFromPb(v.tenant.get),
        namespace = namespaceMatcherFromPb(v.namespace.get),
        topicRegex = v.topicRegex
    )

def regexTopicMatcherToPb(v: RegexTopicMatcher): pb.RegexTopicMatcher =
    pb.RegexTopicMatcher(
        persistency = topicPersistencyTypeToPb(v.persistency),
        tenant = Some(tenantMatcherToPb(v.tenant)),
        namespace = Some(namespaceMatcherToPb(v.namespace)),
        topicRegex = v.topicRegex
    )

def topicMatcherFromPb(v: pb.TopicMatcher): TopicMatcher =
    v.matcher match
        case pb.TopicMatcher.Matcher.Exact(exactTopicMatcher) => TopicMatcher(matcher = exactTopicMatcherFromPb(exactTopicMatcher))
        case pb.TopicMatcher.Matcher.Regex(regexTopicMatcher) => TopicMatcher(matcher = regexTopicMatcherFromPb(regexTopicMatcher))
        case _                                                => throw new IllegalArgumentException("Unknown matcher type")

def topicMatcherToPb(v: TopicMatcher): pb.TopicMatcher =
    v.matcher match
        case exactTopicMatcher: ExactTopicMatcher => pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.Exact(exactTopicMatcherToPb(exactTopicMatcher)))
        case regexTopicMatcher: RegexTopicMatcher => pb.TopicMatcher(matcher = pb.TopicMatcher.Matcher.Regex(regexTopicMatcherToPb(regexTopicMatcher)))

def resourceMatcherFromPb(v: pb.ResourceMatcher): ResourceMatcher =
    v.matcher match
        case pb.ResourceMatcher.Matcher.Tenant(tenantMatcher) => ResourceMatcher(matcher = tenantMatcherFromPb(tenantMatcher))
        case pb.ResourceMatcher.Matcher.Namespace(namespace)  => ResourceMatcher(matcher = namespaceMatcherFromPb(namespace))
        case pb.ResourceMatcher.Matcher.Topic(topicMatcher)   => ResourceMatcher(matcher = topicMatcherFromPb(topicMatcher))
        case _                                                => throw new IllegalArgumentException("Unknown matcher type")

def resourceMatcherToPb(v: ResourceMatcher): pb.ResourceMatcher =
    v.matcher match
        case tenantMatcher: TenantMatcher       => pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Tenant(tenantMatcherToPb(tenantMatcher)))
        case namespaceMatcher: NamespaceMatcher => pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Namespace(namespaceMatcherToPb(namespaceMatcher)))
        case topicMatcher: TopicMatcher         => pb.ResourceMatcher(matcher = pb.ResourceMatcher.Matcher.Topic(topicMatcherToPb(topicMatcher)))

def libraryItemTypeFromPb(v: pb.LibraryItemType): LibraryItemType =
    v match
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG      => "consumer-session-config"
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_SESSION_CONFIG      => "producer-session-config"
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MARKDOWN_DOCUMENT            => "markdown-document"
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER               => "message-filter"
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_WIDGET    => "data-visualization-widget"
        case pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD => "data-visualization-dashboard"
        case _                                                                 => throw new IllegalArgumentException("Unknown library item type")

def libraryItemTypeToPb(v: LibraryItemType): pb.LibraryItemType =
    v match
        case "consumer-session-config"      => pb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG
        case "producer-session-config"      => pb.LibraryItemType.LIBRARY_ITEM_TYPE_PRODUCER_SESSION_CONFIG
        case "markdown-document"            => pb.LibraryItemType.LIBRARY_ITEM_TYPE_MARKDOWN_DOCUMENT
        case "message-filter"               => pb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER
        case "data-visualization-widget"    => pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_WIDGET
        case "data-visualization-dashboard" => pb.LibraryItemType.LIBRARY_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD

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
        descriptorJson = v.descriptorJson,
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
        descriptorJson = v.descriptorJson,
    )
