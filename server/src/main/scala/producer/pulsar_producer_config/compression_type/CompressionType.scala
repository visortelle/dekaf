package producer.pulsar_producer_config.compression_type

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.CompressionType as PulsarCompressionType

type CompressionType = PulsarCompressionType

object CompressionType:
    def fromPb(v: pb.CompressionType): Option[PulsarCompressionType]  =
        v match
            case pb.CompressionType.COMPRESSION_TYPE_LZ4 => Some(PulsarCompressionType.LZ4)
            case pb.CompressionType.COMPRESSION_TYPE_ZLIB => Some(PulsarCompressionType.ZLIB)
            case pb.CompressionType.COMPRESSION_TYPE_ZSTD => Some(PulsarCompressionType.ZSTD)
            case pb.CompressionType.COMPRESSION_TYPE_NONE => Some(PulsarCompressionType.NONE)
            case pb.CompressionType.COMPRESSION_TYPE_SNAPPY => Some(PulsarCompressionType.SNAPPY)
            case _ => None


    def toPb(v: Option[PulsarCompressionType]): pb.CompressionType =
        v match
            case Some(PulsarCompressionType.LZ4) => pb.CompressionType.COMPRESSION_TYPE_LZ4
            case Some(PulsarCompressionType.ZLIB) => pb.CompressionType.COMPRESSION_TYPE_ZLIB
            case Some(PulsarCompressionType.ZSTD) => pb.CompressionType.COMPRESSION_TYPE_ZSTD
            case Some(PulsarCompressionType.NONE) => pb.CompressionType.COMPRESSION_TYPE_NONE
            case Some(PulsarCompressionType.SNAPPY) => pb.CompressionType.COMPRESSION_TYPE_SNAPPY
            case _ => pb.CompressionType.COMPRESSION_TYPE_UNSPECIFIED
