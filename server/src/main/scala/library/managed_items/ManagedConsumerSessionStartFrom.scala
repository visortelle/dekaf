package library.managed_items

import library.{ManagedItemMetadata, ManagedItemTrait, ManagedItemReference}
import _root_.consumer.start_from.{EarliestMessage, LatestMessage}

case class ManagedConsumerSessionStartFromSpec(
    startFrom: EarliestMessage | LatestMessage | ManagedMessageIdValOrRef | ManagedDateTimeValOrRef | ManagedRelativeDateTimeValOrRef
)

case class ManagedConsumerSessionStartFrom(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionStartFromSpec
) extends ManagedItemTrait

case class ManagedConsumerSessionStartFromValOrRef(
    value: Option[ManagedConsumerSessionStartFrom],
    reference: Option[ManagedItemReference]
)
