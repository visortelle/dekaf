package pulsar_auth

import io.grpc.*
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient

import java.time.Instant
import java.util.TimerTask
import scala.jdk.CollectionConverters.*

case class PulsarAdminCacheEntry(
    client: PulsarAdmin,
    expiresAt: Instant
)
case class PulsarClientCacheEntry(
    client: PulsarClient,
    expiresAt: Instant
)

// In case we make a new client for each user's request, after some time it fails with the following error:
// You are creating too many HashedWheelTimer instances.
// HashedWheelTimer is a shared resource that must be reused across the JVM, so that only a few instances are created.
//
// To handle this case, we cache the clients and reuse them for some time.
object ClientsCache:
    private val ttl = scala.concurrent.duration.Duration(10, scala.concurrent.duration.MINUTES)
    private val ttlTimer = new java.util.Timer()
    private val updateTtlTimerTask: TimerTask = new TimerTask:
        override def run(): Unit =
            val now = Instant.now()
            pulsarAdmin = pulsarAdmin.filter(_._2.expiresAt.isAfter(now))
            pulsarClient = pulsarClient.filter(_._2.expiresAt.isAfter(now))

    ttlTimer.scheduleAtFixedRate(updateTtlTimerTask, 0, 1000L)

    private var pulsarAdmin: Map[Int, PulsarAdminCacheEntry] = Map.empty
    private var pulsarClient: Map[Int, PulsarClientCacheEntry] = Map.empty

    private def writePulsarAdmin(auth: PulsarAuth): Either[Throwable, PulsarAdmin] = makePulsarAdmin(auth) match
        case Left(err) => Left(err)
        case Right(client) =>
            val entry = PulsarAdminCacheEntry(
                client = client,
                expiresAt = Instant.now().plusSeconds(ttl.toSeconds)
            )
            pulsarAdmin = pulsarAdmin + (auth.hashCode() -> entry)
            Right(entry.client)

    private def writePulsarClient(auth: PulsarAuth): Either[Throwable, PulsarClient] = makePulsarClient(auth) match
        case Left(err) => Left(err)
        case Right(client) =>
            val entry = PulsarClientCacheEntry(
                client = client,
                expiresAt = Instant.now().plusSeconds(ttl.toSeconds)
            )
            pulsarClient = pulsarClient + (auth.hashCode() -> entry)
            Right(entry.client)

    def getPulsarAdmin(auth: PulsarAuth): Either[Throwable, PulsarAdmin] =
        pulsarAdmin.get(auth.hashCode()) match
            case Some(entry) => Right(entry.client)
            case None => writePulsarAdmin(auth)

    def getPulsarClient(auth: PulsarAuth): Either[Throwable, PulsarClient] =
        pulsarClient.get(auth.hashCode()) match
            case Some(entry) => Right(entry.client)
            case None => writePulsarClient(auth)

object RequestContext:
    val pulsarAuth: Context.Key[PulsarAuth] = Context.key("pulsar_auth")
    val pulsarAdmin: Context.Key[PulsarAdmin] = Context.key("pulsar_admin")
    val pulsarClient: Context.Key[PulsarClient] = Context.key("pulsar_client")

class PulsarAuthInterceptor extends ServerInterceptor:
    override def interceptCall[ReqT, RespT](
        call: ServerCall[ReqT, RespT],
        metadata: Metadata,
        next: ServerCallHandler[ReqT, RespT]
    ): ServerCall.Listener[ReqT] =
        // java.net.HttpCookie.parse parses the cookie string as a single cookie, so we need to split it first
        val headerCookiesSeparated = metadata.get(Metadata.Key.of("cookie", Metadata.ASCII_STRING_MARSHALLER))
            .split(";")
            .map(_.trim)
            .map(_ + ";")

        val pulsarAuthCookie = headerCookiesSeparated
            .flatMap(java.net.HttpCookie.parse(_).asScala)
            .find(_.getName == "pulsar_auth")
            .map(_.getValue)
        val pulsarAuth = parsePulsarAuthCookie(pulsarAuthCookie).getOrElse(defaultPulsarAuth)

        var ctx = Context.current().withValue(RequestContext.pulsarAuth, pulsarAuth)

        val pulsarAdmin = ClientsCache.getPulsarAdmin(pulsarAuth)
        pulsarAdmin match
            case Left(_)   => cancelWithCredentials(ctx, pulsarAuth)
            case Right(pa) => ctx = ctx.withValue(RequestContext.pulsarAdmin, pa)

        val pulsarClient = ClientsCache.getPulsarClient(pulsarAuth)
        pulsarClient match
            case Left(_)   => cancelWithCredentials(ctx, pulsarAuth)
            case Right(pc) => ctx = ctx.withValue(RequestContext.pulsarClient, pc)

        Contexts.interceptCall(ctx, call, metadata, next)

    private def cancelWithCredentials(context: Context, pulsarAuth: PulsarAuth) =
        context
            .withCancellation()
            .cancel(
                Status.UNAUTHENTICATED
                    .withDescription(s"Invalid credentials: ${pulsarAuth.current.getOrElse("")}")
                    .asRuntimeException()
            )

