export type AliyunOssOffloadPolicy = {
  type: "aliyun-oss";
  offloadersDirectory: string;
  managedLedgerOffloadBucket: string;
  managedLedgerOffloadServiceEndpoint: string;
  managedLedgerOffloadReadBufferSizeInBytes?: number;
  managedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type AwsS3OffloadPolicy = {
  type: "aws-s3";
  offloadersDirectory: string;
  s3ManagedLedgerOffloadBucket: string;
  s3ManagedLedgerOffloadRegion?: string;
  s3ManagedLedgerOffloadReadBufferSizeInBytes?: number;
  s3ManagedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type AzureBlobOffloadPolicy = {
  type: "azureblob";
  offloadersDirectory: string;
  managedLedgerOffloadBucket: string;
  managedLedgerOffloadReadBufferSizeInBytes?: number;
  managedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type FilesystemOffloadPolicy = {
  type: "filesystem";
  offloadersDirectory: string;
  fileSystemProfilePath: string;
  fileSystemUri?: string; // required for HDFS
};

export type GoogleCloudStorageOffloadPolicy = {
  type: "google-cloud-storage";
  offloadersDirectory: string;
  gcsManagedLedgerOffloadBucket: string;
  gcsManagedLedgerOffloadRegion: string;
  gcsManagedLedgerOffloadServiceAccountKeyFile: string;
  gcsManagedLedgerOffloadReadBufferSizeInBytes?: number;
  gcsManagedLedgerOffloadMaxBlockSizeInBytes?: number;
};

export type S3OffloadPolicy = {
  type: "S3";
  offloadersDirectory: string;
  managedLedgerOffloadBucket: string;
  managedLedgerOffloadServiceEndpoint: string;
  managedLedgerOffloadReadBufferSizeInBytes?: number;
  managedLedgerOffloadMaxBlockSizeInBytes?: number;
};
