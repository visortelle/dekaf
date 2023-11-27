import { Paths } from "../fs/types";

export type LocalPulsar = {
  name: string,
  version: string,
  color: string,
  brokerConfig: string
};

export type LocalPulsarInfo = {
  diskUsage: number
}

export type CreateLocalPulsar = {
  type: "CreateLocalPulsar"
};

export type CreateLocalPulsarResult = {
  type: "CreateLocalPulsar",
}

export type ListLocalPulsar = {
  type: "ListLocalPulsars"
};

export type ListLocalPulsarsResult = {
  type: "ListLocalPulsarsResult",
}
