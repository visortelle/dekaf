export const knownPulsarVersions = ["3.3.3", "3.1.1", "3.1.0", "3.0.1", "2.11.2"] as const;
export type KnownPulsarVersion = typeof knownPulsarVersions[number];
export type AnyPulsarVersion = string;

export type PulsarVersionInfo = {
  version: KnownPulsarVersion,
  downloadUrl: string,
  sha512: string
};

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
