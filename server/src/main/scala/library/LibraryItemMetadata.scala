package library

import com.tools.teal.pulsar.ui.library.v1.library as pb

case class LibraryItemMetadata(
    updatedAt: String,
    availableForContexts: Vector[ResourceMatcher]
)

object LibraryItemMetadata:
    def fromPb(v: pb.LibraryItemMetadata): LibraryItemMetadata =
        LibraryItemMetadata(
            updatedAt = v.updatedAt,
            availableForContexts = v.availableForContexts.map(resourceMatcherFromPb).toVector
        )

    def toPb(v: LibraryItemMetadata): pb.LibraryItemMetadata =
        pb.LibraryItemMetadata(
            updatedAt = v.updatedAt,
            availableForContexts = v.availableForContexts.map(resourceMatcherToPb)
        )
