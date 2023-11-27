export const knownPulsarVersions = ["3.1.1", "3.1.0", "3.0.1", "2.11.2"] as const;
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
  type: "not-downloaded",
  version: AnyPulsarVersion
} | {
  type: "downloading",
  version: AnyPulsarVersion
  percentage: number
} | {
  type: "downloaded"
  version: AnyPulsarVersion,
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

export type DownloadPulsarDistributionRequest = {
  type: "DownloadPulsarDistributionRequest",
  pulsarVersion: KnownPulsarVersion
}

export type GetPulsarDistributionStatus = {

};

export type PulsarDistributionStatusChanged = {
  type: "PulsarDistributionStatusChanged",
  version: AnyPulsarVersion,
  distributionStatus: PulsarDistributionStatus
}

export type CancelDownloadPulsarDistributionRequest = {
  type: "CancelDownloadPulsarDistributionRequest",
  version: AnyPulsarVersion
}

export type CancelDownloadPulsarDistributionResponse = {
  type: "CancelDownloadPulsarDistributionResponse",
  pulsarVersion: AnyPulsarVersion
}

export type DeletePulsarDistributionRequest = {
  type: "DeletePulsarDistributionRequest",
  pulsarVersion: AnyPulsarVersion
}

export type DeletePulsarDistributionResponse = {
  type: "DeletePulsarDistributionResponse",
  pulsarVersion: AnyPulsarVersion
}
