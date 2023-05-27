// Ref: https://pulsar.apache.org/docs/3.0.x/security-oauth2/
export type AuthConfig = {
  type: 'none'
} | {
  type: 'oauth2',
  issuerUrl: string,
  privateKey: string,
  audience?: string,
  scope?: string
} | {
  type: 'jwt',
  token: string
}

export type AuthType = AuthConfig['type'];

