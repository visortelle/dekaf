import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type CompressionType = 'none' | 'lz4' | 'zlib' | 'zstd' | 'snappy';

export function compressionTypeFromPb(compressionType: pb.CompressionType): CompressionType {
  switch (compressionType) {
    case pb.CompressionType.COMPRESSION_TYPE_NONE: return 'none';
    case pb.CompressionType.COMPRESSION_TYPE_LZ4: return 'lz4';
    case pb.CompressionType.COMPRESSION_TYPE_ZLIB: return 'zlib';
    case pb.CompressionType.COMPRESSION_TYPE_ZSTD: return 'zstd';
    case pb.CompressionType.COMPRESSION_TYPE_SNAPPY: return 'snappy';
    default: throw new Error(`Unknown compression type: ${compressionType}`);
  }
}

export function compressionTypeToPb(compressionType: CompressionType): pb.CompressionType {
  switch (compressionType) {
    case 'none': return pb.CompressionType.COMPRESSION_TYPE_NONE;
    case 'lz4': return pb.CompressionType.COMPRESSION_TYPE_LZ4;
    case 'zlib': return pb.CompressionType.COMPRESSION_TYPE_ZLIB;
    case 'zstd': return pb.CompressionType.COMPRESSION_TYPE_ZSTD;
    case 'snappy': return pb.CompressionType.COMPRESSION_TYPE_SNAPPY;
  }
}

