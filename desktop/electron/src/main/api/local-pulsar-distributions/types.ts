export type PulsarReleaseLine = {
  minorVersion: string,
  knownVersions: KnownPulsarVersion[],
  versionType: 'lts' | 'regular',
  releasedAt: string,
  activeSupportEndsAt: string,
  securitySupportEndsAt: string
};

export type KnownPulsarVersion = {
  version: AnyPulsarVersion,
  downloadUrl: string,
  sha512: string
};

export type AnyPulsarVersion = string;

export type PulsarDistributionStatus = {
  type: "unknown",
  version: AnyPulsarVersion
} | {
  type: "downloading",
  version: AnyPulsarVersion
  bytesTotal: number
  bytesReceived: number
} | {
  type: "unpacking",
  version: AnyPulsarVersion
} | {
  type: "installed"
  version: AnyPulsarVersion,
} | {
  type: "not-installed",
  version: AnyPulsarVersion
} | {
  type: "deleting",
  version: AnyPulsarVersion
} | {
  type: "error",
  version: AnyPulsarVersion
  message: string
};

export type ListPulsarDistributions = {
  type: "ListPulsarDistributions"
}

export type ListPulsarDistributionsResult = {
  type: "ListPulsarDistributionsResult"
  versions?: string[]
}

export type DownloadPulsarDistribution = {
  type: "DownloadPulsarDistribution",
  version: KnownPulsarVersion
}

export type GetPulsarDistributionStatus = {
  type: "GetPulsarDistributionStatus",
  version: string
};

export type PulsarDistributionStatusChanged = {
  type: "PulsarDistributionStatusChanged",
  version: AnyPulsarVersion,
  distributionStatus: PulsarDistributionStatus
}

export type CancelDownloadPulsarDistribution = {
  type: "CancelDownloadPulsarDistributionRequest",
  version: AnyPulsarVersion
}

export type DeletePulsarDistribution = {
  type: "DeletePulsarDistribution",
  version: AnyPulsarVersion
}

export type PulsarDistributionDeleted = {
  type: "PulsarDistributionDeleted",
  version: string
};
