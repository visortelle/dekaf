export const knownPulsarVersions = ["3.1.1", "3.1.0", "3.0.1", "2.11.2"] as const;
export type KnownPulsarVersion = typeof knownPulsarVersions[number];
export type AnyPulsarVersion = string;

export type PulsarVersionInfo = {
  version: string,
  downloadUrl: string,
  sha512: string
};

export type PulsarDistributionStatus = {
  type: "not-downloaded",
  version: string
} | {
  type: "downloading",
  version: string
  percentage: number
} | {
  type: "downloaded"
  version: string,
} | {
  type: "error",
  version: string
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
  pulsarVersion: string,
  distributionStatus: PulsarDistributionStatus
}

export type CancelDownloadPulsarDistributionRequest = {
  type: "CancelDownloadPulsarDistributionRequest",
  pulsarVersion: string
}

export type CancelDownloadPulsarDistributionResponse = {
  type: "CancelDownloadPulsarDistributionResponse",
  pulsarVersion: string
}

export type DeletePulsarDistributionRequest = {
  type: "DeletePulsarDistributionRequest",
  pulsarVersion: string
}

export type DeletePulsarDistributionResponse = {
  type: "DeletePulsarDistributionResponse",
  pulsarVersion: string
}
