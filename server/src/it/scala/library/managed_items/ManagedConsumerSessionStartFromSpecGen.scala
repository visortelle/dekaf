package library.managed_items

import consumer.start_from.LatestMessage

object ManagedConsumerSessionStartFromSpecGen:
    def fromVariant(variant: StartFromVariant): ManagedConsumerSessionStartFromSpec = ManagedConsumerSessionStartFromSpec(
      startFrom = variant
    )

