package producer.pulsar_producer_config.hashing_scheme

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.HashingScheme as PulsarHashingScheme

type HashingScheme = PulsarHashingScheme

object HashingScheme:
    def fromPb(v: pb.HashingScheme): Option[PulsarHashingScheme]  =
        v match
            case pb.HashingScheme.HASHING_SCHEME_JAVA_STRING_HASH => Some(PulsarHashingScheme.JavaStringHash)
            case pb.HashingScheme.HASHING_SCHEME_MURMUR3_HASH_32 => Some(PulsarHashingScheme.Murmur3_32Hash)
            case _ => None


    def toPb(v: Option[PulsarHashingScheme]): pb.HashingScheme =
        v match
            case Some(PulsarHashingScheme.JavaStringHash) => pb.HashingScheme.HASHING_SCHEME_JAVA_STRING_HASH
            case Some(PulsarHashingScheme.Murmur3_32Hash) => pb.HashingScheme.HASHING_SCHEME_MURMUR3_HASH_32
            case _ => pb.HashingScheme.HASHING_SCHEME_UNSPECIFIED
