package producer.message_generator.value_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class ValueFromTopicSchemaGenerator()

object ValueFromTopicSchemaGenerator:
    def fromPb(v: pb.ValueFromTopicSchemaGenerator): ValueFromTopicSchemaGenerator =
        ValueFromTopicSchemaGenerator()

    def toPb(v: ValueFromTopicSchemaGenerator): pb.ValueFromTopicSchemaGenerator =
        pb.ValueFromTopicSchemaGenerator()
