package config

// NB: no `import zio.*` here - it shadows this package's `Config` with `zio.Config`
// (the same trap as `zio.System` vs `java.lang.System`).
import zio.test.*

/** `mergeConfigs` hand-copies every field of `Config`, and Scala's named arguments + case-class
  * defaults make an OMITTED field compile silently - the field just resolves to its default. That
  * is exactly how `cookieSecure` and `cookieSameSite` came to be dropped (both documented in
  * docs/configuration-reference.md, both dead in practice), despite the warning comment on
  * `Config`. These tests are written so the SAME mistake on field #34 fails immediately.
  */
object mergeConfigsTest extends ZIOSpecDefault:

    /** Every field set to a value that differs from the case-class default. The identity property
      * below only detects a dropped field if the fixture's value differs from that field's default,
      * hence the deliberately odd values. */
    private val allSet = Config(
        bindAddress = Some("10.1.2.3"),
        port = Some(19999),
        publicBaseUrl = Some("http://example.test/dekaf"),
        basePath = Some("/dekaf"),
        protocol = Some("https"),
        tlsCertificateFilePath = Some("/tls/cert.pem"),
        tlsKeyFilePath = Some("/tls/key.pem"),
        cookieSecure = Some(true),
        cookieSameSite = Some("strict"),
        dataDir = Some("/var/lib/dekaf-test"),
        pulsarName = Some("fixture-pulsar"),
        pulsarColor = Some("rebeccapurple"),
        pulsarWebUrl = Some("http://pulsar.test:8080"),
        pulsarBrokerUrl = Some("pulsar://pulsar.test:6650"),
        pulsarListenerName = Some("external"),
        pulsarTlsKeyFilePath = Some("/tls/pulsar-key.pem"),
        pulsarTlsCertificateFilePath = Some("/tls/pulsar-cert.pem"),
        pulsarTlsTrustCertsFilePath = Some("/tls/pulsar-ca.pem"),
        pulsarAllowTlsInsecureConnection = Some(true),
        pulsarEnableTlsHostnameVerification = Some(true),
        pulsarUseKeyStoreTls = Some(true),
        pulsarSslProvider = Some("Conscrypt"),
        pulsarTlsKeyStoreType = Some("PKCS12"),
        pulsarTlsKeyStorePath = Some("/tls/keystore.p12"),
        pulsarTlsKeyStorePassword = Some("keystore-pass"),
        pulsarTlsTrustStoreType = Some("JKS"),
        pulsarTlsTrustStorePath = Some("/tls/truststore.p12"),
        pulsarTlsTrustStorePassword = Some("truststore-pass"),
        pulsarTlsCiphers = Some(List("TLS_AES_256_GCM_SHA384")),
        pulsarTlsProtocols = Some(List("TLSv1.3")),
        defaultPulsarAuth = Some("""{"type":"empty"}"""),
        internalHttpPort = Some(18001),
        internalGrpcPort = Some(18002)
    )

    /** A second fixture whose value for EVERY field differs from `allSet`'s value for that same
      * field. The per-field crosswire loop below builds a `high` config that is `allSet` with exactly
      * one field taken from here, so each field's "changed" value is guaranteed to actually differ.
      * Booleans can only flip, so their values necessarily repeat across the three TLS flags - which
      * is precisely why pairwise-distinct fixtures alone cannot catch a crosswire between two equal
      * boolean fields, and why the loop (not the identity/high-wins tests) is what closes that hole. */
    private val allSetAlt = Config(
        bindAddress = Some("10.9.8.7"),
        port = Some(20001),
        publicBaseUrl = Some("http://alt.test/dekaf-alt"),
        basePath = Some("/dekaf-alt"),
        protocol = Some("http"),
        tlsCertificateFilePath = Some("/tls/alt-cert.pem"),
        tlsKeyFilePath = Some("/tls/alt-key.pem"),
        cookieSecure = Some(false),
        cookieSameSite = Some("lax"),
        dataDir = Some("/var/lib/dekaf-alt"),
        pulsarName = Some("alt-pulsar"),
        pulsarColor = Some("goldenrod"),
        pulsarWebUrl = Some("http://alt.test:18080"),
        pulsarBrokerUrl = Some("pulsar://alt.test:16650"),
        pulsarListenerName = Some("internal"),
        pulsarTlsKeyFilePath = Some("/tls/alt-pulsar-key.pem"),
        pulsarTlsCertificateFilePath = Some("/tls/alt-pulsar-cert.pem"),
        pulsarTlsTrustCertsFilePath = Some("/tls/alt-pulsar-ca.pem"),
        pulsarAllowTlsInsecureConnection = Some(false),
        pulsarEnableTlsHostnameVerification = Some(false),
        pulsarUseKeyStoreTls = Some(false),
        pulsarSslProvider = Some("SunJSSE"),
        pulsarTlsKeyStoreType = Some("JKS"),
        pulsarTlsKeyStorePath = Some("/tls/alt-keystore.jks"),
        pulsarTlsKeyStorePassword = Some("alt-keystore-pass"),
        pulsarTlsTrustStoreType = Some("PKCS12"),
        pulsarTlsTrustStorePath = Some("/tls/alt-truststore.p12"),
        pulsarTlsTrustStorePassword = Some("alt-truststore-pass"),
        pulsarTlsCiphers = Some(List("TLS_CHACHA20_POLY1305_SHA256")),
        pulsarTlsProtocols = Some(List("TLSv1.2")),
        defaultPulsarAuth = Some("""{"type":"token"}"""),
        internalHttpPort = Some(28001),
        internalGrpcPort = Some(28002)
    )

    private val mirror = summon[scala.deriving.Mirror.ProductOf[Config]]

    /** `base` with field #`index` replaced by `value`, reconstructed generically so the loop below
      * does not have to hand-name 33 `.copy(...)` calls (the very hand-copying that this suite exists
      * to police). Relies on case-class product order matching the constructor order. */
    private def withField(base: Config, index: Int, value: Any): Config =
        val arr = base.productIterator.toArray
        arr(index) = value
        mirror.fromProduct(Tuple.fromArray(arr))

    private def fieldsOf(c: Config): Map[String, Any] =
        c.productElementNames.zip(c.productIterator).toMap

    private def differingFields(a: Config, b: Config): List[String] =
        val fa = fieldsOf(a)
        fieldsOf(b).collect { case (name, bv) if fa(name) != bv => name }.toList.sorted

    def spec = suite(this.getClass.toString)(
        test("Config declares exactly the fields this suite knows about") {
            // The None-check below and the identity property both go blind to a field whose default
            // is NOT None: the fixture would carry `Some(default)` (so it is not "unset"), and a
            // mergeConfigs that forgot to copy it would fall back to that same default (so nothing
            // differs). Config is mostly non-None defaults - bindAddress, port, publicBaseUrl,
            // basePath, protocol, dataDir, pulsarName, pulsarColor, pulsarWebUrl, pulsarBrokerUrl -
            // so that hole is not hypothetical.
            //
            // Pinning the NAME SET closes it: adding a field to Config fails here first, which is
            // the reminder that `// XXX - don't forget to make changes in mergeConfigs.scala` asks
            // for. Deliberately a name set rather than a count, so the failure says which field.
            val expected = Set(
                "bindAddress", "port", "publicBaseUrl", "basePath", "protocol",
                "tlsCertificateFilePath", "tlsKeyFilePath", "cookieSecure", "cookieSameSite",
                "dataDir", "pulsarName", "pulsarColor", "pulsarWebUrl", "pulsarBrokerUrl",
                "pulsarListenerName", "pulsarTlsKeyFilePath", "pulsarTlsCertificateFilePath",
                "pulsarTlsTrustCertsFilePath", "pulsarAllowTlsInsecureConnection",
                "pulsarEnableTlsHostnameVerification", "pulsarUseKeyStoreTls", "pulsarSslProvider",
                "pulsarTlsKeyStoreType", "pulsarTlsKeyStorePath", "pulsarTlsKeyStorePassword",
                "pulsarTlsTrustStoreType", "pulsarTlsTrustStorePath", "pulsarTlsTrustStorePassword",
                "pulsarTlsCiphers", "pulsarTlsProtocols", "defaultPulsarAuth",
                "internalHttpPort", "internalGrpcPort"
            )
            val actual = fieldsOf(allSet).keySet
            assertTrue(actual == expected) ??
                s"added: ${(actual -- expected).mkString(", ")}; removed: ${(expected -- actual).mkString(", ")}"
        },
        test("the fixture sets every field of Config") {
            // Guards the tests below: a field added to Config but not to `allSet` would be None
            // here, and the identity property could no longer detect it being dropped.
            val unset = fieldsOf(allSet).collect { case (name, None) => name }.toList.sorted
            assertTrue(unset.isEmpty) ?? s"fields missing from the fixture: ${unset.mkString(", ")}"
        },
        test("merging a config with itself preserves every field") {
            // The key property: a field mergeConfigs forgets to copy silently falls back to its
            // case-class default, which differs from the fixture value - so this catches drops.
            val merged = mergeConfigs(allSet, allSet)
            val lost = differingFields(allSet, merged)
            assertTrue(lost.isEmpty) ?? s"mergeConfigs dropped: ${lost.mkString(", ")}"
        },
        test("each field is merged from its OWN source - no crosswire between fields") {
            // The identity and high-wins tests below go blind to a copy-paste crosswire whenever the
            // two swapped fields hold the SAME value: e.g.
            //   pulsarEnableTlsHostnameVerification = highPriority.pulsarAllowTlsInsecureConnection...
            // still yields Some(true) either way when both booleans are Some(true), so every other
            // test stays green. This loop discriminates PER FIELD: for each field it makes `high`
            // equal to `allSet` except for that one field (taken from `allSetAlt`), merges it over
            // `allSet`, and asserts the merge changed EXACTLY that field. A crosswire trips it twice -
            // the field that is read is now written into two outputs (an extra field changes), and the
            // field that is no longer read never changes when it should.
            val names = allSet.productElementNames.toVector
            val altValues = allSetAlt.productIterator.toVector
            val offenders = (0 until allSet.productArity).flatMap { i =>
                val high = withField(allSet, i, altValues(i))
                val merged = mergeConfigs(allSet, high)
                val changed = differingFields(allSet, merged).toSet
                val expected = Set(names(i))
                if changed == expected then None
                else Some(s"${names(i)} -> changed={${changed.toList.sorted.mkString(",")}} expected={${names(i)}}")
            }
            assertTrue(offenders.isEmpty) ?? offenders.mkString("; ")
        },
        test("the high-priority config wins for every field") {
            val low = allSet
            val high = allSet.copy(
                bindAddress = Some("127.0.0.9"),
                port = Some(12345),
                cookieSecure = Some(false),
                cookieSameSite = Some("lax"),
                pulsarTlsCiphers = Some(List("TLS_CHACHA20_POLY1305_SHA256"))
            )
            val merged = mergeConfigs(low, high)
            assertTrue(
                merged.bindAddress == Some("127.0.0.9"),
                merged.port == Some(12345),
                merged.cookieSecure == Some(false),
                merged.cookieSameSite == Some("lax"),
                merged.pulsarTlsCiphers == Some(List("TLS_CHACHA20_POLY1305_SHA256"))
            )
        },
        test("an unset high-priority field falls back to the low-priority value") {
            val high = Config(
                bindAddress = None,
                port = None,
                cookieSecure = None,
                cookieSameSite = None,
                dataDir = None,
                pulsarName = None
            )
            val merged = mergeConfigs(allSet, high)
            assertTrue(
                merged.bindAddress == allSet.bindAddress,
                merged.port == allSet.port,
                merged.cookieSecure == allSet.cookieSecure,
                merged.cookieSameSite == allSet.cookieSameSite,
                merged.dataDir == allSet.dataDir,
                merged.pulsarName == allSet.pulsarName
            )
        },
        test("cookie hardening options survive a merge") {
            // Regression: both were absent from mergeConfigs, so any deployment that set them got
            // silent None and an unhardened cookie.
            val merged = mergeConfigs(Config(cookieSecure = Some(true), cookieSameSite = Some("none")), Config())
            assertTrue(
                merged.cookieSecure == Some(true),
                merged.cookieSameSite == Some("none")
            )
        }
    )
