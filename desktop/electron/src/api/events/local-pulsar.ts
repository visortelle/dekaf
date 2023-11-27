import { Status } from "./response-status";

export type LocalPulsar = {
  name: string,
  version: string,
  color: string,
  brokerConfig: string
};

export type LocalPulsarInfo = {
  diskUsage: number
}

export type CreateLocalPulsarRequest = {
  type: "CreateLocalPulsarRequest"
};

export type CreateLocalPulsarResponse = {
  type: "CreateLocalPulsarResponse",
  status: Status
}

export type ListLocalPulsarsRequest = {
  type: "ListLocalPulsarsRequest"
};

export type ListLocalPulsarsResponse = {
  type: "ListLocalPulsarsResponse",
  status: Status
}
