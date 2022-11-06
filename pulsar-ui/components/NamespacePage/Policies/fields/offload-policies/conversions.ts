import {
  Int64Value,
  StringValue,
} from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import {
  PolicyValue,
  AnyOffloadPolicy,
  AliyunOssOffloadPolicy,
  AwsS3OffloadPolicy,
  AzureBlobOffloadPolicy,
  FilesystemOffloadPolicy,
  GoogleCloudStorageOffloadPolicy,
  S3OffloadPolicy,
  OffloadThreshold,
} from "./types";

export function policyValueToReq(
  p: PolicyValue,
  tenant: string,
  namespace: string
): pb.RemoveOffloadPoliciesRequest | pb.SetOffloadPoliciesRequest {
  switch (p.type) {
    case "inherited-from-broker-config": {
      const req = new pb.RemoveOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);
      return req;
    }
    case "aliyun-oss": {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver("aliyun-oss");
      ppb.setManagedLedgerOffloadThresholdInBytes(
        offloadThresholdToBytes(p.managedLedgerOffloadThreshold)
      );

      ppb.setOffloadersDirectory(
        new StringValue().setValue(p.offloadersDirectory)
      );
      ppb.setManagedLedgerOffloadBucket(
        new StringValue().setValue(p.managedLedgerOffloadBucket)
      );
      ppb.setManagedLedgerOffloadServiceEndpoint(
        new StringValue().setValue(p.managedLedgerOffloadServiceEndpoint)
      );
      ppb.setManagedLedgerOffloadReadBufferSizeInBytes(
        p.managedLedgerOffloadReadBufferSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.managedLedgerOffloadReadBufferSizeInBytes
            )
      );
      ppb.setManagedLedgerOffloadMaxBlockSizeInBytes(
        p.managedLedgerOffloadMaxBlockSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadMaxBlockSizeInBytes)
      );
      ppb.setManagedLedgerOffloadDeletionLagInMillis(
        p.managedLedgerOffloadDeletionLagInMillis === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadDeletionLagInMillis)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case "aws-s3": {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver("aws-s3");
      ppb.setManagedLedgerOffloadThresholdInBytes(
        offloadThresholdToBytes(p.managedLedgerOffloadThreshold)
      );

      ppb.setOffloadersDirectory(
        new StringValue().setValue(p.offloadersDirectory)
      );
      ppb.setS3ManagedLedgerOffloadBucket(
        new StringValue().setValue(p.s3ManagedLedgerOffloadBucket)
      );
      ppb.setS3ManagedLedgerOffloadRegion(
        p.s3ManagedLedgerOffloadRegion === undefined
          ? undefined
          : new StringValue().setValue(p.s3ManagedLedgerOffloadRegion)
      );
      ppb.setS3ManagedLedgerOffloadServiceEndpoint(
        p.s3ManagedLedgerOffloadServiceEndpoint === undefined
          ? undefined
          : new StringValue().setValue(p.s3ManagedLedgerOffloadServiceEndpoint)
      );
      ppb.setS3ManagedLedgerOffloadReadBufferSizeInBytes(
        p.s3ManagedLedgerOffloadReadBufferSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.s3ManagedLedgerOffloadReadBufferSizeInBytes
            )
      );
      ppb.setS3ManagedLedgerOffloadMaxBlockSizeInBytes(
        p.s3ManagedLedgerOffloadMaxBlockSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.s3ManagedLedgerOffloadMaxBlockSizeInBytes
            )
      );
      ppb.setManagedLedgerOffloadDeletionLagInMillis(
        p.managedLedgerOffloadDeletionLagInMillis === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadDeletionLagInMillis)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case "azureblob": {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver("azureblob");
      ppb.setManagedLedgerOffloadThresholdInBytes(
        offloadThresholdToBytes(p.managedLedgerOffloadThreshold)
      );

      ppb.setOffloadersDirectory(
        new StringValue().setValue(p.offloadersDirectory)
      );
      ppb.setManagedLedgerOffloadBucket(
        new StringValue().setValue(p.managedLedgerOffloadBucket)
      );
      ppb.setManagedLedgerOffloadReadBufferSizeInBytes(
        p.managedLedgerOffloadReadBufferSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.managedLedgerOffloadReadBufferSizeInBytes
            )
      );
      ppb.setManagedLedgerOffloadMaxBlockSizeInBytes(
        p.managedLedgerOffloadMaxBlockSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadMaxBlockSizeInBytes)
      );
      ppb.setManagedLedgerOffloadDeletionLagInMillis(
        p.managedLedgerOffloadDeletionLagInMillis === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadDeletionLagInMillis)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case "filesystem": {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver("filesystem");
      ppb.setManagedLedgerOffloadThresholdInBytes(
        offloadThresholdToBytes(p.managedLedgerOffloadThreshold)
      );

      ppb.setOffloadersDirectory(
        new StringValue().setValue(p.offloadersDirectory)
      );
      ppb.setFileSystemProfilePath(
        new StringValue().setValue(p.fileSystemProfilePath)
      );
      ppb.setFileSystemUri(
        p.fileSystemUri === undefined
          ? undefined
          : new StringValue().setValue(p.fileSystemUri)
      );
      ppb.setManagedLedgerOffloadDeletionLagInMillis(
        p.managedLedgerOffloadDeletionLagInMillis === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadDeletionLagInMillis)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case "google-cloud-storage": {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver("google-cloud-storage");
      ppb.setManagedLedgerOffloadThresholdInBytes(
        offloadThresholdToBytes(p.managedLedgerOffloadThreshold)
      );

      ppb.setOffloadersDirectory(
        new StringValue().setValue(p.offloadersDirectory)
      );
      ppb.setGcsManagedLedgerOffloadBucket(
        new StringValue().setValue(p.gcsManagedLedgerOffloadBucket)
      );
      ppb.setGcsManagedLedgerOffloadRegion(
        new StringValue().setValue(p.gcsManagedLedgerOffloadRegion)
      );
      ppb.setGcsManagedLedgerOffloadServiceAccountKeyFile(
        new StringValue().setValue(
          p.gcsManagedLedgerOffloadServiceAccountKeyFile
        )
      );
      ppb.setGcsManagedLedgerOffloadReadBufferSizeInBytes(
        p.gcsManagedLedgerOffloadReadBufferSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.gcsManagedLedgerOffloadReadBufferSizeInBytes
            )
      );
      ppb.setGcsManagedLedgerOffloadMaxBlockSizeInBytes(
        p.gcsManagedLedgerOffloadMaxBlockSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.gcsManagedLedgerOffloadMaxBlockSizeInBytes
            )
      );
      ppb.setManagedLedgerOffloadDeletionLagInMillis(
        p.managedLedgerOffloadDeletionLagInMillis === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadDeletionLagInMillis)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case "S3": {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver("S3");
      ppb.setManagedLedgerOffloadThresholdInBytes(
        offloadThresholdToBytes(p.managedLedgerOffloadThreshold)
      );

      ppb.setOffloadersDirectory(
        new StringValue().setValue(p.offloadersDirectory)
      );
      ppb.setManagedLedgerOffloadBucket(
        new StringValue().setValue(p.managedLedgerOffloadBucket)
      );
      ppb.setManagedLedgerOffloadServiceEndpoint(
        new StringValue().setValue(p.managedLedgerOffloadServiceEndpoint)
      );
      ppb.setManagedLedgerOffloadReadBufferSizeInBytes(
        p.managedLedgerOffloadReadBufferSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(
              p.managedLedgerOffloadReadBufferSizeInBytes
            )
      );
      ppb.setManagedLedgerOffloadMaxBlockSizeInBytes(
        p.managedLedgerOffloadMaxBlockSizeInBytes === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadMaxBlockSizeInBytes)
      );
      ppb.setManagedLedgerOffloadDeletionLagInMillis(
        p.managedLedgerOffloadDeletionLagInMillis === undefined
          ? undefined
          : new Int64Value().setValue(p.managedLedgerOffloadDeletionLagInMillis)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }
  }
}

export function resToPolicyValue(
  res: pb.GetOffloadPoliciesResponse
): PolicyValue {
  if (
    res.getOffloadPoliciesCase() ===
    pb.GetOffloadPoliciesResponse.OffloadPoliciesCase.INHERITED
  ) {
    return { type: "inherited-from-broker-config" };
  }

  if (
    res.getOffloadPoliciesCase() ===
    pb.GetOffloadPoliciesResponse.OffloadPoliciesCase.SPECIFIED
  ) {
    const p = res.getSpecified()!;

    switch (p.getManagedLedgerOffloadDriver() as AnyOffloadPolicy["type"]) {
      case "aliyun-oss": {
        const v: AliyunOssOffloadPolicy = {
          type: "aliyun-oss",
          managedLedgerOffloadThreshold: offloadThresholdFromBytes(
            p.getManagedLedgerOffloadThresholdInBytes()
          ),
          offloadersDirectory:
            p.getOffloadersDirectory()?.toObject().value ?? "",
          managedLedgerOffloadBucket:
            p.getManagedLedgerOffloadBucket()?.toObject().value ?? "",
          managedLedgerOffloadServiceEndpoint:
            p.getManagedLedgerOffloadServiceEndpoint()?.toObject().value ?? "",
          managedLedgerOffloadReadBufferSizeInBytes: p
            .getManagedLedgerOffloadReadBufferSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadMaxBlockSizeInBytes: p
            .getManagedLedgerOffloadMaxBlockSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadDeletionLagInMillis: p
            .getManagedLedgerOffloadDeletionLagInMillis()
            ?.toObject().value,
        };
        return v;
      }

      case "aws-s3": {
        const v: AwsS3OffloadPolicy = {
          type: "aws-s3",
          managedLedgerOffloadThreshold: offloadThresholdFromBytes(
            p.getManagedLedgerOffloadThresholdInBytes()
          ),
          offloadersDirectory:
            p.getOffloadersDirectory()?.toObject().value ?? "",
          s3ManagedLedgerOffloadBucket:
            p.getS3ManagedLedgerOffloadBucket()?.toObject().value ?? "",
          s3ManagedLedgerOffloadRegion: p
            .getS3ManagedLedgerOffloadRegion()
            ?.toObject().value,
          s3ManagedLedgerOffloadServiceEndpoint: p
            .getS3ManagedLedgerOffloadServiceEndpoint()
            ?.toObject().value,
          s3ManagedLedgerOffloadReadBufferSizeInBytes: p
            .getS3ManagedLedgerOffloadReadBufferSizeInBytes()
            ?.toObject().value,
          s3ManagedLedgerOffloadMaxBlockSizeInBytes: p
            .getS3ManagedLedgerOffloadMaxBlockSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadDeletionLagInMillis: p
            .getManagedLedgerOffloadDeletionLagInMillis()
            ?.toObject().value,
        };
        return v;
      }

      case "azureblob": {
        const v: AzureBlobOffloadPolicy = {
          type: "azureblob",
          managedLedgerOffloadThreshold: offloadThresholdFromBytes(
            p.getManagedLedgerOffloadThresholdInBytes()
          ),
          offloadersDirectory:
            p.getOffloadersDirectory()?.toObject().value ?? "",
          managedLedgerOffloadBucket:
            p.getManagedLedgerOffloadBucket()?.toObject().value ?? "",
          managedLedgerOffloadReadBufferSizeInBytes: p
            .getManagedLedgerOffloadReadBufferSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadMaxBlockSizeInBytes: p
            .getManagedLedgerOffloadMaxBlockSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadDeletionLagInMillis: p
            .getManagedLedgerOffloadDeletionLagInMillis()
            ?.toObject().value,
        };
        return v;
      }

      case "filesystem": {
        const v: FilesystemOffloadPolicy = {
          type: "filesystem",
          managedLedgerOffloadThreshold: offloadThresholdFromBytes(
            p.getManagedLedgerOffloadThresholdInBytes()
          ),
          fileSystemProfilePath:
            p.getFileSystemProfilePath()?.toObject().value ?? "",
          offloadersDirectory:
            p.getOffloadersDirectory()?.toObject().value ?? "",
          fileSystemUri: p.getFileSystemUri()?.toObject().value ?? undefined,
          managedLedgerOffloadDeletionLagInMillis: p
            .getManagedLedgerOffloadDeletionLagInMillis()
            ?.toObject().value,
        };
        return v;
      }

      case "google-cloud-storage": {
        const v: GoogleCloudStorageOffloadPolicy = {
          type: "google-cloud-storage",
          managedLedgerOffloadThreshold: offloadThresholdFromBytes(
            p.getManagedLedgerOffloadThresholdInBytes()
          ),
          gcsManagedLedgerOffloadBucket:
            p.getGcsManagedLedgerOffloadBucket()?.toObject().value ?? "",
          gcsManagedLedgerOffloadRegion:
            p.getGcsManagedLedgerOffloadRegion()?.toObject().value ?? "",
          gcsManagedLedgerOffloadServiceAccountKeyFile:
            p.getGcsManagedLedgerOffloadServiceAccountKeyFile()?.toObject()
              .value ?? "",
          offloadersDirectory:
            p.getOffloadersDirectory()?.toObject().value ?? "",
          gcsManagedLedgerOffloadMaxBlockSizeInBytes: p
            .getGcsManagedLedgerOffloadMaxBlockSizeInBytes()
            ?.toObject().value,
          gcsManagedLedgerOffloadReadBufferSizeInBytes: p
            .getGcsManagedLedgerOffloadReadBufferSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadDeletionLagInMillis: p
            .getManagedLedgerOffloadDeletionLagInMillis()
            ?.toObject().value,
        };
        return v;
      }

      case "S3": {
        const v: S3OffloadPolicy = {
          type: "S3",
          managedLedgerOffloadThreshold: offloadThresholdFromBytes(
            p.getManagedLedgerOffloadThresholdInBytes()
          ),
          managedLedgerOffloadBucket:
            p.getManagedLedgerOffloadBucket()?.toObject().value ?? "",
          managedLedgerOffloadServiceEndpoint:
            p.getManagedLedgerOffloadServiceEndpoint()?.toObject().value ?? "",
          offloadersDirectory:
            p.getOffloadersDirectory()?.toObject().value ?? "",
          managedLedgerOffloadMaxBlockSizeInBytes: p
            .getManagedLedgerOffloadMaxBlockSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadReadBufferSizeInBytes: p
            .getManagedLedgerOffloadReadBufferSizeInBytes()
            ?.toObject().value,
          managedLedgerOffloadDeletionLagInMillis: p
            .getManagedLedgerOffloadDeletionLagInMillis()
            ?.toObject().value,
        };
        return v;
      }

      default:
        throw new Error(
          `Unknown offload driver: ${p.getManagedLedgerOffloadDriver()}`
        );
    }
  }

  throw new Error("Offload policies not set");
}

export function offloadThresholdToBytes(threshold: OffloadThreshold): number {
  switch (threshold.type) {
    case "disabled-automatic-offloading":
      return -1;
    case "offload-as-soon-as-possible":
      return 0;
    case "offload-when-topic-storage-reaches-threshold":
      return threshold.bytes;
  }
}

export function offloadThresholdFromBytes(bytes: number): OffloadThreshold {
  if (bytes < 0) {
    return { type: "disabled-automatic-offloading" };
  } else if (bytes === 0) {
    return { type: "offload-as-soon-as-possible" };
  } else {
    return {
      type: "offload-when-topic-storage-reaches-threshold",
      bytes,
    };
  }
}

export function defaultPolicyValueByType(
  type: PolicyValue["type"],
  policiesRes: pb.GetOffloadPoliciesResponse | undefined
): PolicyValue {
  let newValue: PolicyValue;

  switch (type) {
    case "inherited-from-broker-config": {
      newValue = { type: "inherited-from-broker-config" };
      break;
    }
    case "aliyun-oss": {
      newValue = {
        type: "aliyun-oss",
        offloadersDirectory:
          policiesRes?.getSpecified()?.getOffloadersDirectory()?.toObject()
            .value ?? "",
        managedLedgerOffloadThreshold: offloadThresholdFromBytes(
          policiesRes
            ?.getSpecified()
            ?.getManagedLedgerOffloadThresholdInBytes() ?? 0
        ),
        managedLedgerOffloadDeletionLagInMillis: policiesRes
          ?.getSpecified()
          ?.getManagedLedgerOffloadDeletionLagInMillis()
          ?.toObject().value,
        managedLedgerOffloadBucket: "",
        managedLedgerOffloadServiceEndpoint: "",
        managedLedgerOffloadMaxBlockSizeInBytes: undefined,
        managedLedgerOffloadReadBufferSizeInBytes: undefined,
      };
      break;
    }
    case "aws-s3": {
      newValue = {
        type: "aws-s3",
        offloadersDirectory:
          policiesRes?.getSpecified()?.getOffloadersDirectory()?.toObject()
            .value ?? "",
        managedLedgerOffloadThreshold: offloadThresholdFromBytes(
          policiesRes
            ?.getSpecified()
            ?.getManagedLedgerOffloadThresholdInBytes() ?? 0
        ),
        managedLedgerOffloadDeletionLagInMillis: policiesRes
          ?.getSpecified()
          ?.getManagedLedgerOffloadDeletionLagInMillis()
          ?.toObject().value,
        s3ManagedLedgerOffloadBucket: "",
        s3ManagedLedgerOffloadServiceEndpoint: "",
        s3ManagedLedgerOffloadRegion: undefined,
        s3ManagedLedgerOffloadReadBufferSizeInBytes: undefined,
        s3ManagedLedgerOffloadMaxBlockSizeInBytes: undefined,
      };
      break;
    }
    case "azureblob": {
      newValue = {
        type: "azureblob",
        offloadersDirectory:
          policiesRes?.getSpecified()?.getOffloadersDirectory()?.toObject()
            .value ?? "",
        managedLedgerOffloadThreshold: offloadThresholdFromBytes(
          policiesRes
            ?.getSpecified()
            ?.getManagedLedgerOffloadThresholdInBytes() ?? 0
        ),
        managedLedgerOffloadDeletionLagInMillis: policiesRes
          ?.getSpecified()
          ?.getManagedLedgerOffloadDeletionLagInMillis()
          ?.toObject().value,
        managedLedgerOffloadBucket: "",
        managedLedgerOffloadMaxBlockSizeInBytes: undefined,
        managedLedgerOffloadReadBufferSizeInBytes: undefined,
      };
      break;
    }
    case "filesystem": {
      newValue = {
        type: "filesystem",
        offloadersDirectory:
          policiesRes?.getSpecified()?.getOffloadersDirectory()?.toObject()
            .value ?? "",
        managedLedgerOffloadThreshold: offloadThresholdFromBytes(
          policiesRes
            ?.getSpecified()
            ?.getManagedLedgerOffloadThresholdInBytes() ?? 0
        ),
        managedLedgerOffloadDeletionLagInMillis: policiesRes
          ?.getSpecified()
          ?.getManagedLedgerOffloadDeletionLagInMillis()
          ?.toObject().value,
        fileSystemProfilePath: "",
        fileSystemUri: "",
      };
      break;
    }
    case "google-cloud-storage": {
      newValue = {
        type: "google-cloud-storage",
        offloadersDirectory:
          policiesRes?.getSpecified()?.getOffloadersDirectory()?.toObject()
            .value ?? "",
        managedLedgerOffloadThreshold: offloadThresholdFromBytes(
          policiesRes
            ?.getSpecified()
            ?.getManagedLedgerOffloadThresholdInBytes() ?? 0
        ),
        managedLedgerOffloadDeletionLagInMillis: policiesRes
          ?.getSpecified()
          ?.getManagedLedgerOffloadDeletionLagInMillis()
          ?.toObject().value,
        gcsManagedLedgerOffloadBucket: "",
        gcsManagedLedgerOffloadRegion: "",
        gcsManagedLedgerOffloadServiceAccountKeyFile: "",
        gcsManagedLedgerOffloadMaxBlockSizeInBytes: undefined,
        gcsManagedLedgerOffloadReadBufferSizeInBytes: undefined,
      };
      break;
    }
    case "S3": {
      newValue = {
        type: "S3",
        offloadersDirectory:
          policiesRes?.getSpecified()?.getOffloadersDirectory()?.toObject()
            .value ?? "",
        managedLedgerOffloadThreshold: offloadThresholdFromBytes(
          policiesRes
            ?.getSpecified()
            ?.getManagedLedgerOffloadThresholdInBytes() ?? 0
        ),
        managedLedgerOffloadDeletionLagInMillis: policiesRes
          ?.getSpecified()
          ?.getManagedLedgerOffloadDeletionLagInMillis()
          ?.toObject().value,
        managedLedgerOffloadBucket: "",
        managedLedgerOffloadServiceEndpoint: "",
        managedLedgerOffloadMaxBlockSizeInBytes: undefined,
        managedLedgerOffloadReadBufferSizeInBytes: undefined,
      };
    }
  }
  return newValue;
}
