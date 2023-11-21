package library

import scalapb.json4s.JsonFormat
import com.tools.teal.pulsar.ui.library.v1.library as pb

case class LibraryItem(
    metadata: LibraryItemMetadata,
    spec: ManagedItem
)

object LibraryItem:
    def fromPb(v: pb.LibraryItem): LibraryItem =
        LibraryItem(
            metadata = LibraryItemMetadata.fromPb(v.metadata.get),
            spec = ManagedItem.fromPb(v.spec.get)
        )

    def toPb(v: LibraryItem): pb.LibraryItem =
        pb.LibraryItem(
            metadata = Some(LibraryItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedItem.toPb(v.spec))
        )

    def fromJson(json: String): LibraryItem = LibraryItem.fromPb(JsonFormat.fromJsonString[pb.LibraryItem](json))
    def toJson(item: LibraryItem): String =
        val itemPb = LibraryItem.toPb(item)
        JsonFormat.toJsonString[pb.LibraryItem](itemPb)
