package producer.message_generator.value_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class ValueFromTopicSchemaGenerator(
    topicFqn: String
)

object ValueFromTopicSchemaGenerator:
    def fromPb(v: pb.ValueFromTopicSchemaGenerator): ValueFromTopicSchemaGenerator =
        ValueFromTopicSchemaGenerator(
            topicFqn = v.topicFqn
        )

    def toPb(v: ValueFromTopicSchemaGenerator): pb.ValueFromTopicSchemaGenerator =
        pb.ValueFromTopicSchemaGenerator(
            topicFqn = v.topicFqn
        )
