import { Status } from "./response-status"

export type GetPulsarDistributionsRequest = {
  type: "GetPulsarDistributionsRequest"
}

export type GetPulsarDistributionsResponse = {
  type: "GetPulsarDistributionsResponse"
  status: Status,
  versions?: string[]
}

export type DownloadPulsarDistributionRequest = {
  type: "DownloadPulsarDistributionRequest",
  pulsarVersion: string
}

export type PulsarDistributionDownloadStatusChanged = {
  type: "PulsarDistributionDownloadStatusChanged",
  status: Status,
  pulsarVersion: string,
  progress: string
}

export type CancelDownloadPulsarDistributionRequest = {
  type: "CancelDownloadPulsarDistributionRequest",
  pulsarVersion: string
}

export type CancelDownloadPulsarDistributionResponse = {
  type: "CancelDownloadPulsarDistributionResponse",
  status: Status,
  pulsarVersion: string
}

export type DeletePulsarDistributionRequest = {
  type: "DeletePulsarDistributionRequest",
  pulsarVersion: string
}

export type DeletePulsarDistributionResponse = {
  type: "DeletePulsarDistributionResponse",
  status: Status,
  pulsarVersion: string
}
