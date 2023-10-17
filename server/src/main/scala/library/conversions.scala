package library

import com.tools.teal.pulsar.ui.library.v1.library as libraryPb
import consumer.{
    consumerSessionConfigFromPb,
    consumerSessionConfigToPb,
    messageFilterChainFromPb,
    messageFilterChainToPb,
    messageFilterFromPb,
    messageFilterToPb
}

def libraryItemMetadataFromPb(v: libraryPb.LibraryItemMetadata): LibraryItemMetadata =
    LibraryItemMetadata(
        updatedAt = v.updatedAt,
        tags = v.tags.toList,
        availableForContexts = v.availableForContexts.map(resourceMatcherFromPb).toList
    )

def libraryItemMetadataToPb(v: LibraryItemMetadata): libraryPb.LibraryItemMetadata =
    libraryPb.LibraryItemMetadata(
        updatedAt = v.updatedAt,
        tags = v.tags,
        availableForContexts = v.availableForContexts.map(resourceMatcherToPb)
    )

def libraryItemFromPb(v: libraryPb.LibraryItem): LibraryItem =
    LibraryItem(
        metadata = libraryItemMetadataFromPb(v.metadata.get),
        spec = userManagedItemFromPb(v.spec.get)
    )

def libraryItemToPb(v: LibraryItem): libraryPb.LibraryItem =
    libraryPb.LibraryItem(
        metadata = Some(libraryItemMetadataToPb(v.metadata)),
        spec = Some(userManagedItemToPb(v.spec))
    )
