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
            keyGenerator = v.keyGenerator.map(KeyGenerator.fromPb),
            valueGenerator = v.valueGenerator.map(ValueGenerator.fromPb),
            propertiesGenerator = v.propertiesGenerator.map(PropertiesGenerator.fromPb),
            eventTimeGenerator = v.eventTimeGenerator.map(EventTimeGenerator.fromPb),
            deliverAtGenerator = v.deliverAtGenerator.map(DeliverAtGenerator.fromPb),
            deliverAfterGenerator = v.deliverAfterGenerator.map(DeliverAfterGenerator.fromPb),
            orderingKeyGenerator = v.orderingKeyGenerator.map(OrderingKeyGenerator.fromPb),
            sequenceIdGenerator = v.sequenceIdGenerator.map(SequenceIdGenerator.fromPb)
        )

    def toPb(v: MessageGenerator): pb.MessageGenerator =
        pb.MessageGenerator(
            keyGenerator = v.keyGenerator.map(KeyGenerator.toPb),
            valueGenerator = v.valueGenerator.map(ValueGenerator.toPb),
            propertiesGenerator = v.propertiesGenerator.map(PropertiesGenerator.toPb),
            eventTimeGenerator = v.eventTimeGenerator.map(EventTimeGenerator.toPb),
            deliverAtGenerator = v.deliverAtGenerator.map(DeliverAtGenerator.toPb),
            deliverAfterGenerator = v.deliverAfterGenerator.map(DeliverAfterGenerator.toPb),
            orderingKeyGenerator = v.orderingKeyGenerator.map(OrderingKeyGenerator.toPb),
            sequenceIdGenerator = v.sequenceIdGenerator.map(SequenceIdGenerator.toPb)
        )
