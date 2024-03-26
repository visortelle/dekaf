package producer.message_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import _root_.producer.message_generator.key_generator.KeyGenerator
import _root_.producer.message_generator.value_generator.ValueGenerator
import _root_.producer.message_generator.properties_generator.PropertiesGenerator
import _root_.producer.message_generator.event_time_generator.EventTimeGenerator
import _root_.producer.message_generator.deliver_at_generator.DeliverAtGenerator
import _root_.producer.message_generator.deliver_after_generator.DeliverAfterGenerator
import _root_.producer.message_generator.ordering_key_generator.OrderingKeyGenerator
import _root_.producer.message_generator.sequence_id_generator.SequenceIdGenerator

case class MessageGenerator(
    keyGenerator: Option[KeyGenerator],
    valueGenerator: Option[ValueGenerator],
    propertiesGenerator: Option[PropertiesGenerator],
    eventTimeGenerator: Option[EventTimeGenerator],
    deliverAtGenerator: Option[DeliverAtGenerator],
    deliverAfterGenerator: Option[DeliverAfterGenerator],
    orderingKeyGenerator: Option[OrderingKeyGenerator],
    sequenceIdGenerator: Option[SequenceIdGenerator]
)

object MessageGenerator:
    def fromPb(v: pb.MessageGenerator): MessageGenerator =
        MessageGenerator(
            keyGenerator = v.generatorKey.map(KeyGenerator.fromPb),
            valueGenerator = v.generatorValue.map(ValueGenerator.fromPb),
            propertiesGenerator = v.generatorProperties.map(PropertiesGenerator.fromPb),
            eventTimeGenerator = v.generatorEventTime.map(EventTimeGenerator.fromPb),
            deliverAtGenerator = v.generatorDeliverAt.map(DeliverAtGenerator.fromPb),
            deliverAfterGenerator = v.generatorDeliverAfter.map(DeliverAfterGenerator.fromPb),
            orderingKeyGenerator = v.generatorOrderingKey.map(OrderingKeyGenerator.fromPb),
            sequenceIdGenerator = v.generatorSequenceId.map(SequenceIdGenerator.fromPb)
        )

    def toPb(v: MessageGenerator): pb.MessageGenerator =
        pb.MessageGenerator(
            generatorKey = v.keyGenerator.map(KeyGenerator.toPb),
            generatorValue = v.valueGenerator.map(ValueGenerator.toPb),
            generatorProperties = v.propertiesGenerator.map(PropertiesGenerator.toPb),
            generatorEventTime = v.eventTimeGenerator.map(EventTimeGenerator.toPb),
            generatorDeliverAt = v.deliverAtGenerator.map(DeliverAtGenerator.toPb),
            generatorDeliverAfter = v.deliverAfterGenerator.map(DeliverAfterGenerator.toPb),
            generatorOrderingKey = v.orderingKeyGenerator.map(OrderingKeyGenerator.toPb),
            generatorSequenceId = v.sequenceIdGenerator.map(SequenceIdGenerator.toPb)
        )
