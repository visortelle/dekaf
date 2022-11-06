export type AnyOffloadPolicy =
  AliyunOssOffloadPolicy |
  AwsS3OffloadPolicy |
  AzureBlobOffloadPolicy |
  FilesystemOffloadPolicy |
  GoogleCloudStorageOffloadPolicy |
  S3OffloadPolicy;

export type PolicyValue = { type: 'inherited-from-broker-config' } | AnyOffloadPolicy;

export type OffloadThreshold =
  { type: 'disabled-automatic-offloading' } | // < 0
  { type: 'offload-as-soon-as-possible' } | // == 0
  { type: 'offload-when-topic-storage-reaches-threshold', bytes: number } // > 0


export type CommonOffloadPolicy = {
  offloadersDirectory: string;
  managedLedgerOffloadThreshold: OffloadThreshold;
  managedLedgerOffloadDeletionLagInMillis?: number;
}

export type AliyunOssOffloadPolicy = CommonOffloadPolicy & {
  type: "aliyun-oss";
  managedLedgerOffloadBucket: string;
  managedLedgerOffloadServiceEndpoint: string;
  managedLedgerOffloadReadBufferSizeInBytes?: number;
  managedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type AwsS3OffloadPolicy = CommonOffloadPolicy & {
  type: "aws-s3";
  s3ManagedLedgerOffloadBucket: string;
  s3ManagedLedgerOffloadRegion?: string;
  s3ManagedLedgerOffloadReadBufferSizeInBytes?: number;
  s3ManagedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type AzureBlobOffloadPolicy = CommonOffloadPolicy & {
  type: "azureblob";
  managedLedgerOffloadBucket: string;
  managedLedgerOffloadReadBufferSizeInBytes?: number;
  managedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type FilesystemOffloadPolicy = CommonOffloadPolicy & {
  type: "filesystem";
  fileSystemProfilePath: string;
  fileSystemUri?: string; // required for HDFS
};

export type GoogleCloudStorageOffloadPolicy = CommonOffloadPolicy & {
  type: "google-cloud-storage";
  gcsManagedLedgerOffloadBucket: string;
  gcsManagedLedgerOffloadRegion: string;
  gcsManagedLedgerOffloadServiceAccountKeyFile: string;
  gcsManagedLedgerOffloadReadBufferSizeInBytes?: number;
  gcsManagedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type S3OffloadPolicy = CommonOffloadPolicy & {
  type: "S3";
  managedLedgerOffloadBucket: string;
  managedLedgerOffloadServiceEndpoint: string;
  managedLedgerOffloadReadBufferSizeInBytes?: number;
  managedLedgerOffloadMaxBlockSizeInBytes?: number;
};
