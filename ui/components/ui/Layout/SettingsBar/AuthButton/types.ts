export type OAuth2Config = {
  type: 'oauth2',
  issuerUrl: string,
  privateKey: string,
  audience: string,
  scope: string
};

export type JwtConfig = {
  type: 'jwt',
  token: string
}

// Ref: https://pulsar.apache.org/docs/3.0.x/security-oauth2/
export type AuthConfig = {
  type: 'none'
} | OAuth2Config | JwtConfig;

export type AuthType = AuthConfig['type'];
