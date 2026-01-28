# Configuration Reference

By default, Dekaf reads the `config.yaml` file in the current working directory.

You can use `DEKAF_` environment variable prefix, following by the configuration field name in the screaming snake case:

```sh
DEKAF_PULSAR_WEB_URL="http://my-pulsar:8080"
DEKAF_PULSAR_BROKER_URL="pulsar://my-pulsar:6650`"
```

The `config.yaml` have priority over environment variables.

### Basic configuration

|Field                           |Example                       |Description                                                                                                                                                                                                                                                                                                                                                               |
|---                                |---                          |---                                                                                                                                                                                                                                                                                                                                                                       |
|port                               |`8090`                         | The port the server listens on. ⚠️ In some cases, you also need to set `publicBaseUrl`. See [#323](https://github.com/visortelle/dekaf/issues/323)
|dataDir                            |`./data`                         | Path to the persistent data directory.

### Pulsar Instance

|Field                           |Example                       |Description                                                                                                                                                                                                                                                                                                                                                               |
|---                                |---                          |---                                                                                                                                                                                                                                                                                                                                                                       |
|pulsarName                          |`default`                    | Pulsar instance name.                                                                                                                                                                                                                                                                                                    |
|pulsarColor                          |`#ff0000`                    | Optional accent color to visually distinguish this instance.                                                                                                                                                                                                                                                                                                    |
|pulsarWebUrl                          |`http://localhost:8080`                    | Pulsar web service URL.                                                                                                                                                                                                                                                                                                    |
|pulsarBrokerUrl                          |`pulsar://localhost:6650`                    | Pulsar service URL.                                                                                                                                                                                                                                                                                                    |
|pulsarListenerName                     |`external`                                     | [Advertised listener](https://pulsar.apache.org/docs/next/concepts-multiple-advertised-listeners/) name. |
|defaultPulsarAuth||Default authentication credentials for all users serialized as JSON. Not recommended to use it in multi-user production environments. [See more details in the section below](#default-pulsar-auth) |

### Dekaf &lt;-&gt; Pulsar Instance TLS

|Field                           |Description                                                                                                                                                                                                                                                                                                                                                               |
|---                                |---                                                                                                                                                                                                                                                                                                                                                                       |
|pulsarTlsKeyFilePath               |Path to the TLS key file.                                                                                                                                                                                                                                                                                      |
|pulsarTlsCertificateFilePath       |Path to the TLS certificate file.                                                                                                                                                                                                                                                                              |
|pulsarTlsTrustCertsFilePath        |Path to the trusted TLS certificate file.                                                                                                                                                                                                                                                                      |
|pulsarAllowTlsInsecureConnection   |Configure whether the Pulsar client accept untrusted TLS certificate from broker                                                                                                                                                                                                                              |
|pulsarEnableTlsHostnameVerification |It allows to validate hostname verification when client connects to broker over tls. It validates incoming x509 certificate and matches provided hostname(CN/SAN) with expected broker's host name. It follows RFC 2818, 3.1. Server Identity hostname verification. See https://tools.ietf.org/html/rfc2818|
|pulsarUseKeyStoreTls |If Tls is enabled, whether use KeyStore type as tls configuration parameter.False means use default pem type configuration.|
|pulsarSslProvider |The name of the security provider used for SSL connections. Default value is the default security provider of the JVM.|
|pulsarTlsKeyStoreType|The file format of the key store file.|
|pulsarTlsKeyStorePath|The location of the key store file.|
|pulsarTlsKeyStorePassword|The store password for the key store file.|
|pulsarTlsTrustStoreType|The file format of the trust store file.|
|pulsarTlsTrustStorePath|The location of the trust store file.|
|pulsarTlsTrustStorePassword|The store password for the trust store file.|
|pulsarTlsCiphers|A list of cipher suites. This is a named combination of authentication, encryption, MAC and key exchange algorithm used to negotiate the security settings for a network connection using TLS or SSL network protocol. By default all the available cipher suites are supported.|
|pulsarTlsProtocols|The SSL protocol used to generate the SSLContext. Default setting is TLS, which is fine for most cases. Allowed values in recent JVMs are TLS, TLSv1.3, TLSv1.2 and TLSv1.1.|

### Running Dekaf behind reverse-proxy

|Field                           |Example                      |Description                                                                                                                                                                                                                                                                                                                                                               |
|---                                |---                          |---                                                                                                                                                                                                                                                                                                                                                                       |
|basePath                           | `/dekaf`                    |When running the application behind a reverse-proxy, it may be useful to specify a base path.                                                                                                                                                                                                               |
|publicBaseUrl                      | `https://dev.my.org/dekaf`  |When running the application behind a reverse-proxy, you need to provide a public URL to let the application know how to render links and making redirects correctly.                                                                                                                 |

### Dekaf &lt;-&gt; Web TLS

:::warning

Don't forget to set the `publicBaseUrl` to the public URL of the application, otherwise, the application won't work properly.

Also set the appropriate cookie settings.

:::

|Field                           |Description                                                                                                                                                                                                                                                                                                                                                               |
|---                                |---                                                                                                                                                                                                                                                                                                                                                                       |
|protocol                       | `http` or `https`                                                                                                                                                                                                                                                                                                                                                      |
|tlsKeyFilePath               |Path to the TLS key file.                                                                                                                                                                                                                                                                                      |
|tlsCertificateFilePath       |Path to the TLS certificate file.                                                                                                                                                                                                                                                                              |

### Cookies

|Field                           |Description                                                                                                                                                                                                                                                                                                                                                               |
|---                                |---                                                                                                                                                                                                                                                                                                                                                                       |
|cookieSecure                       | `true` or `false`. Set it to `true` if you use the `https` protocol.                                                                                                                                                                                                                                                                                                                                                      |
|cookieSameSite               | `true` or `false`. Set it to `true` if you use the `https` protocol.                                                                                                                                                                                                                                                                                      |

### Default Pulsar Auth

You can specify default Dekaf <---> Pulsar authentication. 
It will be stored as a browser cookie for all Dekaf users.

Example of specifying default Pulsar auth using environment variable:

`DEKAF_DEFAULT_PULSAR_AUTH: '{"type":"jwt","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30"}'`

Supported authentication methods:

- [EmptyCredentials](https://github.com/visortelle/dekaf/blob/31723122e2c4221fe7d67d52015253980846c169/server/src/main/scala/pulsar_auth/PulsarAuth.scala#L31) - for Pulsar instances with disabled authentication.
- [OAuth2Credentials](https://github.com/visortelle/dekaf/blob/31723122e2c4221fe7d67d52015253980846c169/server/src/main/scala/pulsar_auth/PulsarAuth.scala#L35)
- [JwtCredentials](https://github.com/visortelle/dekaf/blob/31723122e2c4221fe7d67d52015253980846c169/server/src/main/scala/pulsar_auth/PulsarAuth.scala#L43C12-L43C26)
- [AuthParamsStringCredentials](https://github.com/visortelle/dekaf/blob/31723122e2c4221fe7d67d52015253980846c169/server/src/main/scala/pulsar_auth/PulsarAuth.scala#L48) - Allows to specify `authPluginClassName` and arbitrary `authParams`. Please search for `authParams` in the Pulsar documentation.

The `type` field values for each authentication method can be found here: https://github.com/visortelle/dekaf/blob/31723122e2c4221fe7d67d52015253980846c169/server/src/main/scala/pulsar_auth/PulsarAuth.scala#L20
