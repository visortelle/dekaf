package consumer

import io.circe.{Encoder, Decoder}
import io.circe.generic.semiauto.{deriveEncoder, deriveDecoder}
import io.circe.syntax.EncoderOps

case class EditorFilter(
    value: String,
    description: String,
    name: String,
    scope: Option[EditorFilterScope]
)

object EditorFilter {
    given Encoder[EditorFilter] = deriveEncoder[EditorFilter]
    given Decoder[EditorFilter] = deriveDecoder[EditorFilter]
}

case class EditorFilterScope(
    tenant: Option[String],
    namespace: Option[String],
    topicName: Option[String],
    topicType: Option[String],
)

object EditorFilterScope {
    given Encoder[EditorFilterScope] = deriveEncoder[EditorFilterScope]
    given Decoder[EditorFilterScope] = deriveDecoder[EditorFilterScope]
}

case class MessageFiltersCollection(
    id: String,
    name: String,
    filtersMap: Map[String, EditorFilter]
)

object MessageFiltersCollection {
    given messageFiltersCollectionEncoder: Encoder[MessageFiltersCollection] = deriveEncoder[MessageFiltersCollection]
    given messageFiltersCollectionDecoder: Decoder[MessageFiltersCollection] = deriveDecoder[MessageFiltersCollection]
}

