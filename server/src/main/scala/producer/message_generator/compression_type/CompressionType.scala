package producer.message_generator.compression_type

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.CompressionType as PulsarCompressionType

type CompressionType = PulsarCompressionType

object CompressionType:
    def fromPb(v: pb.CompressionType): PulsarCompressionType  =
        v match
            case pb.CompressionType.COMPRESSION_TYPE_LZ4 => PulsarCompressionType.LZ4
            case pb.CompressionType.COMPRESSION_TYPE_ZLIB => PulsarCompressionType.ZLIB
            case pb.CompressionType.COMPRESSION_TYPE_ZSTD => PulsarCompressionType.ZSTD
            case pb.CompressionType.COMPRESSION_TYPE_NONE => PulsarCompressionType.NONE
            case pb.CompressionType.COMPRESSION_TYPE_SNAPPY => PulsarCompressionType.SNAPPY
            case _ => throw Exception(s"Unknown compression type: $v")


    def toPb(v: PulsarCompressionType): pb.CompressionType =
        v match
            case PulsarCompressionType.LZ4 => pb.CompressionType.COMPRESSION_TYPE_LZ4
            case PulsarCompressionType.ZLIB => pb.CompressionType.COMPRESSION_TYPE_ZLIB
            case PulsarCompressionType.ZSTD => pb.CompressionType.COMPRESSION_TYPE_ZSTD
            case PulsarCompressionType.NONE => pb.CompressionType.COMPRESSION_TYPE_NONE
            case PulsarCompressionType.SNAPPY => pb.CompressionType.COMPRESSION_TYPE_SNAPPY
            case _ => throw Exception(s"Unknown compression type: $v")
