package producer.message_generator.data_generators

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class RandomUuidV4Generator():
    def generate: String = java.util.UUID.randomUUID().toString

object RandomUuidV4Generator:
    def fromPb(v: pb.RandomUuidV4Generator): RandomUuidV4Generator =
        RandomUuidV4Generator()

    def toPb(v: RandomUuidV4Generator): pb.RandomUuidV4Generator =
        pb.RandomUuidV4Generator()
