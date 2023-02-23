import { IoConfigField } from "../../../../IoConfigField/IoConfigField";
import { StringMap } from "../../configurationsFields";

export type HTTPConfigs = {
  [key: string]: string | StringMap,
  url: string,
  headers: StringMap,
}

export const httpFields: IoConfigField[] = [
  {
    name: 'url',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'URL',
  },
  {
    name: 'headers',
    type: 'map',
    isRequired: false,
    help: 'help',
    label: 'Headers',
    mapType: 'string',
  },
];

export const httpDefault: HTTPConfigs = {
  url: '',
  headers: {},
}