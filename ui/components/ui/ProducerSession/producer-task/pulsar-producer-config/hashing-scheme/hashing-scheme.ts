import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type HashingScheme = 'java-string-hash' | 'murmur3-hash-32';

export function hashingSchemeFromPb(hashingScheme: pb.HashingScheme): HashingScheme {
  switch (hashingScheme) {
    case pb.HashingScheme.HASHING_SCHEME_JAVA_STRING_HASH: return 'java-string-hash';
    case pb.HashingScheme.HASHING_SCHEME_MURMUR3_HASH_32: return 'murmur3-hash-32';
    default: throw new Error(`Unknown hashing scheme: ${hashingScheme}`);
  }
}

export function hashingSchemeToPb(hashingScheme: HashingScheme): pb.HashingScheme {
  switch (hashingScheme) {
    case 'java-string-hash': return pb.HashingScheme.HASHING_SCHEME_JAVA_STRING_HASH;
    case 'murmur3-hash-32': return pb.HashingScheme.HASHING_SCHEME_MURMUR3_HASH_32;
    default : throw new Error(`Unknown hashing scheme: ${hashingScheme}`);
  }
}

