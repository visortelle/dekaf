package pulsar_auth

import zio.*
import zio.test.*
import zio.test.Assertion.*

/** Client-construction contracts behind the auth interceptor (BUG-19's server layer):
  *   - Empty (anonymous/default) credentials MUST build - turning the historically-discarded
  *     "unsupported" branch into a throw once broke every anonymous request.
  *   - Credentials whose Authentication cannot be constructed (e.g. a malformed OAuth2 URL) MUST
  *     come back as Left - never an escaped exception (which used to kill the whole call chain).
  *   - A well-formed AuthParamsString builds even for an unknown plugin class: Pulsar loads the
  *     plugin lazily at connect time, so construction is Right (the interceptor's UNAUTHENTICATED
  *     path is instead exercised end-to-end by the NAV-14 browser test).
  * Construction is offline (no broker connection is made), so these run without a stack.
  */
object ClientConstructionTest extends ZIOSpecDefault {

    private def auth(name: String, credentials: Credentials): PulsarAuth =
        PulsarAuth(credentials = Map(name -> credentials), current = Some(name))

    def spec = suite(this.getClass.toString)(
        test("empty credentials build an anonymous admin client (Right)") {
            val result = makePulsarAdmin(auth("anon", EmptyCredentials(`type` = "empty")))
            assertTrue(result.isRight)
        },
        test("a malformed OAuth2 issuer URL yields Left, not an escaped exception") {
            val bad = OAuth2Credentials(
                `type` = "oauth2",
                issuerUrl = "::: not a url :::",
                privateKey = "data:application/json;base64,e30=",
                audience = None,
                scope = None
            )
            val admin = makePulsarAdmin(auth("bad", bad))
            val client = makePulsarClient(auth("bad", bad))
            assertTrue(admin.isLeft, client.isLeft)
        },
        test("a well-formed AuthParamsString builds (plugin is loaded lazily at connect)") {
            val aps = AuthParamsStringCredentials(
                `type` = "authParamsString",
                authPluginClassName = "org.apache.pulsar.client.impl.auth.AuthenticationToken",
                authParams = "token:abc"
            )
            assertTrue(makePulsarAdmin(auth("aps", aps)).isRight)
        },
        test("a JWT credential constructs offline (Right)") {
            val jwt = JwtCredentials(`type` = "jwt", token = "header.payload.signature")
            assertTrue(makePulsarAdmin(auth("jwt", jwt)).isRight)
        },
        test("a current name with no matching credentials yields Left") {
            val dangling = PulsarAuth(credentials = Map.empty, current = Some("ghost"))
            assertTrue(makePulsarAdmin(dangling).isLeft, makePulsarClient(dangling).isLeft)
        }
    )
}
