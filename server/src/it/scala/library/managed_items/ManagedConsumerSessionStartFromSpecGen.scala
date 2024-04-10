package library.managed_items

import consumer.start_from.LatestMessage

object ManagedConsumerSessionStartFromSpecGen:
    def latestMessage: ManagedConsumerSessionStartFromSpec = ManagedConsumerSessionStartFromSpec(
      startFrom = LatestMessage()
    )
