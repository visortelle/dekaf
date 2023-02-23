import { IoConfigField } from "../../../../IoConfigField/IoConfigField"

export type SolrConfigs = {
  [key: string]: string | number,
  solrUrl: string,
  solrMode: string,
  solrCollection: string,
  solrCommitWithinMs: number,
  username: string,
  password: string,
}

export const solrFields: IoConfigField[] = [
  {
    name: 'solrUrl',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Solr url',
  },
  {
    name: 'solrMode',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Solr mode',
  },
  {
    name: 'solrCollection',
    type: 'string',
    isRequired: true,
    help: 'help',
    label: 'Solr collection',
  },
  {
    name: 'solrCommitWithinMs',
    type: 'duration',
    isRequired: false,
    help: 'help',
    label: 'Solr commit',
  },
  {
    name: 'username',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Username',
  },
  {
    name: 'password',
    type: 'string',
    isRequired: false,
    help: 'help',
    label: 'Password',
  },
];

export const solrDefault: SolrConfigs = {
  solrUrl: '',
  solrMode: 'SolrCloud',
  solrCollection: '',
  solrCommitWithinMs: 10,
  username: '',
  password: '',
}