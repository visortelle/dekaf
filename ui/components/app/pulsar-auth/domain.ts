export type EmptyCredentials = {
  type: 'empty'
}

export type OAuth2Credentials = {
  type: 'oauth2',
  issuerUrl: string,
  privateKey: string,
  audience: string,
  scope: string
};

export type JwtCredentials = {
  type: 'jwt',
  token: string
}

// Ref: https://pulsar.apache.org/docs/3.0.x/security-oauth2/
export type Credentials = EmptyCredentials | OAuth2Credentials | JwtCredentials;

export type CredentialsType = Credentials['type'];

export type CredentialsName = string;
export type CredentialsMap = Record<CredentialsName, Credentials>;

export const pulsarAuthCookieKey = 'pulsar_auth';
export type PulsarAuthCookieValue = CredentialsMap;

export type MaskedCredentials = { name: string, type: CredentialsType };
