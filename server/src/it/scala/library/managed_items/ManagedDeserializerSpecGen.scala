package library.managed_items

import _root_.consumer.deserializer.Deserializer
import consumer.deserializer.deserializers.UseLatestTopicSchema

object ManagedDeserializerSpecGen:
    def useLatestTopicSchema: ManagedDeserializerSpec =
        ManagedDeserializerSpec(
            deserializer = Deserializer(
                deserializer = UseLatestTopicSchema()
            )
        )
