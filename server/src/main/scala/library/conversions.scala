package library

import com.tools.teal.pulsar.ui.library.v1.library as libraryPb
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

def libraryItemFromPb(v: libraryPb.LibraryItem): LibraryItem =
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

def libraryItemToPb(v: LibraryItem): libraryPb.LibraryItem =
    libraryPb.LibraryItem(
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

def libraryItemDescriptorFromPb(descriptor: libraryPb.LibraryItemDescriptor): LibraryItemDescriptor = descriptor.`type` match
    case libraryPb.LibraryItemType.LIBRARY_ITEM_TYPE_CONSUMER_SESSION_CONFIG =>
        LibraryItemDescriptor(
            `type` = UserManagedItemType.ConsumerSessionConfig,
            value = consumerSessionConfigFromPb(descriptor.value.consumerSessionConfig.get)
        )
    case libraryPb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER =>
        LibraryItemDescriptor(
            `type` = UserManagedItemType.MessageFilter,
            value = messageFilterFromPb(descriptor.value.messageFilter.get)
        )
    case libraryPb.LibraryItemType.LIBRARY_ITEM_TYPE_MESSAGE_FILTER_CHAIN =>
        LibraryItemDescriptor(
            `type` = UserManagedItemType.MessageFilterChain,
            value = messageFilterChainFromPb(descriptor.value.messageFilterChain.get)
        )
    case _ => throw new IllegalArgumentException(s"Unknown library item type: ${descriptor.`type`}")

def libraryItemDescriptorToPb(descriptor: LibraryItemDescriptor): libraryPb.LibraryItemDescriptor =
    descriptor.value match
        case v: ConsumerSessionConfig =>
            libraryPb.LibraryItemDescriptor(
                `type` = userManagedItemTypeToPb(UserManagedItemType.ConsumerSessionConfig),
                value = libraryPb.LibraryItemDescriptor.Value.ConsumerSessionConfig(consumerSessionConfigToPb(v))
            )
        case v: MessageFilter =>
            libraryPb.LibraryItemDescriptor(
                `type` = userManagedItemTypeToPb(UserManagedItemType.MessageFilter),
                value = libraryPb.LibraryItemDescriptor.Value.MessageFilter(messageFilterToPb(v))
            )
        case v: MessageFilterChain =>
            libraryPb.LibraryItemDescriptor(
                `type` = userManagedItemTypeToPb(UserManagedItemType.MessageFilterChain),
                value = libraryPb.LibraryItemDescriptor.Value.MessageFilterChain(messageFilterChainToPb(v))
            )
