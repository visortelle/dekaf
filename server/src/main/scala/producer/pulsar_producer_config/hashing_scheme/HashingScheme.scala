package producer.pulsar_producer_config.hashing_scheme

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.HashingScheme as PulsarHashingScheme

type HashingScheme = PulsarHashingScheme

object HashingScheme:
    def fromPb(v: pb.HashingScheme): PulsarHashingScheme  =
        v match
            case pb.HashingScheme.HASHING_SCHEME_JAVA_STRING_HASH => PulsarHashingScheme.JavaStringHash
            case pb.HashingScheme.HASHING_SCHEME_MURMUR3_HASH_32 => PulsarHashingScheme.Murmur3_32Hash
            case _ => throw Exception(s"Unknown hashing scheme: $v")


    def toPb(v: PulsarHashingScheme): pb.HashingScheme =
        v match
            case PulsarHashingScheme.JavaStringHash => pb.HashingScheme.HASHING_SCHEME_JAVA_STRING_HASH
            case PulsarHashingScheme.Murmur3_32Hash => pb.HashingScheme.HASHING_SCHEME_MURMUR3_HASH_32
            case _ => throw Exception(s"Unknown hashing scheme: $v")
